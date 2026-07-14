const RESPONSE_SHEET_NAME = 'Responses';
const BOOKS_SHEET_NAME = 'books_august';
const MAX_SELECTIONS = 4;

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  if (params.books === '1') {
    return jsonResponse_({
      success: true,
      books: getBooks_()
    });
  }

  if (params.check === '1') {
    const sheet = getResponsesSheet_();
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
    message: 'SF Book Club XI August poll service is running.'
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const payload = JSON.parse(e.postData.contents || '{}');
    const name = cleanText_(payload.name, 80);
    const voterId = cleanText_(payload.voterId, 200);
    const source = cleanText_(payload.source, 100);
    const choices = Array.isArray(payload.choices)
      ? [...new Set(payload.choices.map(String))]
      : [];

    const validBooks = getBooks_().map(book => book.bookName);

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

    if (choices.some(choice => validBooks.indexOf(choice) === -1)) {
      return jsonResponse_({
        success: false,
        message: 'The ballot contains an invalid book choice.'
      });
    }

    const sheet = getResponsesSheet_();

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
      E VoterId
      F Source
    */
    sheet.appendRow([
      new Date(),
      JSON.stringify(choices),
      '',
      name,
      voterId,
      source || 'sf_book_club_xi_august'
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

function getBooks_() {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = spreadsheet.getSheetByName(BOOKS_SHEET_NAME);

  if (!sheet) {
    return [];
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const header = values.shift().map(value => String(value || '').trim());
  const idxBook = header.indexOf('BOOK_NAME');
  const idxAuthor = header.indexOf('AUTHOR_NAME');
  const idxGoodread = header.indexOf('GOODREAD_LINK');
  const idxGenre = header.indexOf('GENRE');
  const idxDescription = header.indexOf('brief_description');

  if (idxBook === -1) {
    return [];
  }

  return values
    .map(row => ({
      bookName: cleanText_(row[idxBook], 300),
      authorName: idxAuthor === -1 ? '' : cleanText_(row[idxAuthor], 200),
      goodreadLink: idxGoodread === -1 ? '' : cleanUrl_(row[idxGoodread]),
      genre: idxGenre === -1 ? '' : cleanText_(row[idxGenre], 500),
      briefDescription: idxDescription === -1 ? '' : cleanText_(row[idxDescription], 1200)
    }))
    .filter(book => book.bookName);
}

function getResponsesSheet_() {
  const spreadsheet = SpreadsheetApp.getActive();
  let sheet = spreadsheet.getSheetByName(RESPONSE_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(RESPONSE_SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Book Choice', 'Suggestion', 'Name', 'VoterId', 'Source']);
    return sheet;
  }

  const requiredHeaders = ['Timestamp', 'Book Choice', 'Suggestion', 'Name', 'VoterId', 'Source'];
  let lastColumn = Math.max(sheet.getLastColumn(), 1);
  let header = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(value => String(value || '').trim());

  if (sheet.getLastRow() === 0 || header.every(value => !value)) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  requiredHeaders.forEach(requiredHeader => {
    if (header.indexOf(requiredHeader) === -1) {
      sheet.insertColumnAfter(sheet.getLastColumn());
      sheet.getRange(1, sheet.getLastColumn()).setValue(requiredHeader);
      lastColumn = sheet.getLastColumn();
      header = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
        .map(value => String(value || '').trim());
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

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(value => String(value || '').trim());

  const idxVoterId = header.indexOf('VoterId');
  const idxName = header.indexOf('Name');

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const normalizedName = normalize_(name);

  return values.some(row => {
    const existingVoterId = idxVoterId === -1 ? '' : String(row[idxVoterId] || '').trim();
    const existingName = idxName === -1 ? '' : normalize_(row[idxName]);

    return (
      (voterId && existingVoterId === voterId) ||
      (normalizedName && existingName === normalizedName)
    );
  });
}

function calculateResults_() {
  const sheet = getResponsesSheet_();
  const books = getBooks_();
  const tallies = {};

  books.forEach(book => {
    tallies[book.bookName] = 0;
  });

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return {
      totalVotes: 0,
      tallies: tallies
    };
  }

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(value => String(value || '').trim());

  const idxBookChoice = header.indexOf('Book Choice');

  if (idxBookChoice === -1) {
    return {
      totalVotes: 0,
      tallies: tallies
    };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const validBookNames = books.map(book => book.bookName);
  let totalVotes = 0;

  values.forEach(row => {
    const rawValue = String(row[idxBookChoice] || '').trim();

    if (!rawValue) {
      return;
    }

    let choices = [];

    try {
      const parsed = JSON.parse(rawValue);
      choices = Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch (error) {
      choices = [rawValue];
    }

    const validChoices = [...new Set(choices)]
      .filter(choice => validBookNames.indexOf(choice) !== -1);

    if (validChoices.length === 0) {
      return;
    }

    totalVotes += 1;

    validChoices.forEach(choice => {
      tallies[choice] = (tallies[choice] || 0) + 1;
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

function cleanUrl_(value) {
  const url = String(value || '').trim();

  if (!url) {
    return '';
  }

  if (!/^https?:\/\//i.test(url)) {
    return '';
  }

  return url.slice(0, 1000);
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
