SF BOOK CLUB XI — AUGUST 16, 2026 POLL

FILES
-----
1. sf_book_club_xi_august_poll.html
   Upload this file to GitHub Pages.

2. Code.gs
   Paste this into the Apps Script project attached to your Google Sheet.

GOOGLE SHEET TABS
-----------------
1. books_august

This sheet controls the book options shown on the webpage.

Required columns:

BOOK_NAME
AUTHOR_NAME
GOODREAD_LINK
GENRE
brief_description

The header names must match exactly.

2. Responses

This sheet stores votes.

The script will create or update these headers:

Timestamp
Book Choice
Suggestion
Name
VoterId
Source

Suggestion stays blank because this poll does not collect suggestions.

APPS SCRIPT
-----------
1. Open the Google Sheet.
2. Select Extensions > Apps Script.
3. Replace the old Apps Script code with the contents of Code.gs.
4. Save.
5. Select Deploy > Manage deployments.
6. Edit the Web App deployment or create a new Web App deployment.
7. Execute as: Me.
8. Who has access: Anyone.
9. Deploy.
10. Copy the URL ending in /exec.

HTML
----
In sf_book_club_xi_august_poll.html, replace both appearances of:

SCRIPT_URL_GOES_HERE

with the Apps Script URL ending in /exec.

There are two appearances:

1. The form action attribute.
2. The SCRIPT_URL JavaScript constant.

GITHUB PAGES
------------
Upload sf_book_club_xi_august_poll.html to your GitHub Pages repository.

You can rename it index.html if this should be the main page.

VOTING RULES
------------
- Each voter must select at least one book.
- Each voter may select no more than four.
- Selecting a fifth option is blocked immediately.
- Submitting one, two, or three choices asks for confirmation.
- Results appear after submission.
- Results can be opened directly using ?results=1.
- Percentages represent the share of ballots containing each book.
- Percentages do not total 100% because ballots can contain multiple books.

DUPLICATE PROTECTION
--------------------
The poll checks both:

- A browser-specific VoterId stored in localStorage.
- The normalized voter name saved in the Google Sheet.

If a second vote is attempted, the user sees an alert:

"You have already voted. This second vote was not recorded."

BOOK DISPLAY
------------
Each book card shows:

- Book name
- Author name
- Genre, inside an expandable section
- Brief description, inside an expandable section
- Goodreads link at the end

This keeps long genre or description values from making the page too tall.
