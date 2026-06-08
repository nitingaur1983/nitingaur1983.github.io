const SHEET_NAME = 'Responses';
const MAX_SELECTIONS = 4;

const VALID_BOOKS = [
  'Siddhartha',
  'The Berry Pickers',
  '21 Lessons for the 21st Century',
  'The Remains of the Day',
  'Inventing the Renaissance',
  'The Midnight Library',
  'Persepolis',
  'Strange Houses',
  'Invisible Man',
  'The Body Keeps the Score'
];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  if (params.check === '1') {
    const sheet = getResponseSheet_();
    const voterId = cleanText_(params.voterId, 200);
    const name = cleanText_(params.name, 80);

    return jsonResponse_({
      allowed: !hasExistingVote_(sheet, voterId, name)
    });
  }

  if (params.summary === '1') {
    return jsonResponse_(calculateResults_());
  }

  return jsonResponse_({
    success: true,
    message: 'SF Book Club X poll service is running.'
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const payload = JSON.parse(e.postData.contents || '{}');
    const name = cleanText_(payload.name, 80);
    const voterId = cleanText_(payload.voterId, 200);
    const choices = Array.isArray(payload.choices)
      ? [...new Set(payload.choices.map(String))]
      : [];

    if (!name) {
      return jsonResponse_({
        success: false,
        message: 'Please enter your name.'
      });
    }

    if (!voterId) {
      return jsonResponse_({
        success: false,
        message: 'A voter identifier is required.'
      });
    }

    if (choices.length < 1 || choices.length > MAX_SELECTIONS) {
      return jsonResponse_({
        success: false,
        message: 'Please choose between one and four books.'
      });
    }

    if (choices.some(choice => !VALID_BOOKS.includes(choice))) {
      return jsonResponse_({
        success: false,
        message: 'The ballot contains an invalid book choice.'
      });
    }

    const sheet = getResponseSheet_();

    if (hasExistingVote_(sheet, voterId, name)) {
      return jsonResponse_({
        success: false,
        message: 'A vote from this browser or name has already been recorded.'
      });
    }

    /*
      Spreadsheet columns:
      A Timestamp
      B Book Choice
      C Suggestion — retained but left blank
      D Name
      E Voter ID
      F Source
    */
    sheet.appendRow([
      new Date(),
      JSON.stringify(choices),
      '',
      name,
      voterId,
      cleanText_(payload.source, 100)
    ]);

    const results = calculateResults_();

    return jsonResponse_({
      success: true,
      message: 'Vote submitted.',
      totalVotes: results.totalVotes,
      tallies: results.tallies
    });

  } catch (error) {
    console.error(error);

    return jsonResponse_({
      success: false,
      message: 'The vote could not be saved. Please try again.'
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
      // Ignore when the lock was not acquired.
    }
  }
}

function getResponseSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const headers = [
    'Timestamp',
    'Book Choice',
    'Suggestion',
    'Name',
    'Voter ID',
    'Source'
  ];

  headers.forEach((header, index) => {
    const cell = sheet.getRange(1, index + 1);

    if (cell.getValue() !== header) {
      cell.setValue(header);
    }
  });

  sheet.setFrozenRows(1);
  return sheet;
}

function hasExistingVote_(sheet, voterId, name) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return false;
  }

  const rows = sheet.getRange(2, 4, lastRow - 1, 2).getValues();
  const normalizedName = normalize_(name);

  return rows.some(row => {
    const existingName = normalize_(row[0]);
    const existingVoterId = String(row[1] || '').trim();

    return (
      (voterId && existingVoterId === voterId) ||
      (normalizedName && existingName === normalizedName)
    );
  });
}

function calculateResults_() {
  const sheet = getResponseSheet_();
  const tallies = {};

  VALID_BOOKS.forEach(book => {
    tallies[book] = 0;
  });

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return {
      totalVotes: 0,
      tallies: tallies
    };
  }

  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  let totalVotes = 0;

  values.forEach(row => {
    const rawValue = String(row[0] || '').trim();

    if (!rawValue) {
      return;
    }

    let choices = [];

    try {
      const parsed = JSON.parse(rawValue);
      choices = Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch (error) {
      // Backward compatibility with a single plain-text choice.
      choices = [rawValue];
    }

    const validChoices = [...new Set(choices)]
      .filter(choice => VALID_BOOKS.includes(choice));

    if (validChoices.length === 0) {
      return;
    }

    totalVotes += 1;

    validChoices.forEach(choice => {
      tallies[choice] += 1;
    });
  });

  return {
    totalVotes: totalVotes,
    tallies: tallies
  };
}

function cleanText_(value, maxLength) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function normalize_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
