SF BOOK CLUB X POLL — SETUP

FILES
-----
1. sf_book_club_x_poll.html
   Upload this file to GitHub Pages.

2. Code.gs
   Paste this into the Apps Script project attached to your Google Sheet.


GOOGLE SHEET
------------
Use a sheet tab named:

Responses

Your original columns remain:

A  Timestamp
B  Book Choice
C  Suggestion
D  Name

The new script also uses:

E  Voter ID
F  Source

The Suggestion column stays blank because the new poll does not accept suggestions.


APPS SCRIPT
-----------
1. Open the Google Sheet.
2. Select Extensions > Apps Script.
3. Replace the old Apps Script code with the contents of Code.gs.
4. Save.
5. Select Deploy > Manage deployments.
6. Edit the existing Web App deployment or create a new Web App deployment.
7. Execute as: Me.
8. Who has access: Anyone.
9. Deploy.
10. Copy the URL ending in /exec.


HTML
----
In sf_book_club_x_poll.html, replace both appearances of:

SCRIPT_URL_GOES_HERE

with the Apps Script URL ending in /exec.

There are two appearances:

1. The form action attribute.
2. The SCRIPT_URL JavaScript constant.


GITHUB PAGES
------------
Upload sf_book_club_x_poll.html to your GitHub Pages repository.

You may rename it index.html if it should be the main page.


VOTING RULES
------------
- Each voter must select at least one book.
- Each voter may select no more than four.
- Selecting a fifth option is blocked immediately.
- Submitting one, two, or three choices asks for confirmation.
- Results appear after submission.
- Percentages represent the share of ballots containing each book.
- Percentages do not total 100% because ballots can contain multiple books.


DUPLICATE PROTECTION
--------------------
The poll checks both:

- A browser-specific voter ID stored in localStorage.
- The normalized voter name saved in the Google Sheet.

This prevents ordinary repeat voting. It cannot provide absolute identity
verification unless you add a login system.
