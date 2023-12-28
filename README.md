# Christmas List Maker (Beta)
---

[Click here to visit the live version of Christmas List Maker (Beta)](https://christmas-list-maker-production.up.railway.app/)

This is the server for the app. The front-end, created with React, Typescript, and Material UI can be found This project uses an Express server. [HERE](https://github.com/njhaus/christmas-list-maker)
## Overview
---
**Christmas List Maker** is a web application inspired by easily-lost handwritten Christmas lists, too-long email chains, temporary text groups, and randomized gift exchange assignments that never seem quite random enough. The Christmas List Maker makes these problems obsolete by allowing groups of family or friends to make and share Christmas lists, communicate which items they have bought, and even choose who buys for who, all from a single app!

This site is fully functional and free to be used for its intended purpose by the general public. However, it is in its beta version. There are some known bugs and upcoming features which will be described below.

This site was not completed as part of any course. It is a completely original application.

### Features:
**Christmas List Maker** users can:
* Create a password-protected group.
* Add names of people to your group.
* Randomly assign any number of recipients to each gift giver. (Manual assignment feature coming sometime before December 2099!)
* Make a password for each member of your group
  
Each group member can:
* Make a Christmas list for yourself that other gift-givers can see.
* Mark the gifts from others' list you have bought. Other gift givers can see which gift you bought, but the recipient cannot!
* Write notes to other gift givers.

---

### Technical Specifications:
This project is written with React, Typescript, Material UI, and some custom CSS for the front end. Express and NodeJS are used to serve the back end, and SQLite3 is used for the database.

#### List of technologies used:
- React + Vite
- Material UI
- React Router
- Custom React Hooks
- Custom React API Services
- Typescript (Used in React components and in utiliy functions)
- Node.js
- Node Package Manager (NPM)
- Express
- Express Router
- Express Middleware
- Cookies
- Sessions
- Password encryption with bcrypt
- SQLite
- Environment Variables
- HTML Sanitization and Web Security
- CRUD Operations
- Git and Github
- Web Deployment on Railway

### Core Dependencies:
- express
- SQLite
- bcrypt
- cookie-parser
- body-parser
- cors
- express
- express-session
- helmet
- joi
- sanitize-html
- uuid

---

### Known bugs:
* Refreshing the page (besides the home page) leads to a 404 error.
* 404 route does not render from react-router.
* Users are able to input websites that are not formatted correctly.
* Website links show on user gifts even if no link is available.
* Names are decapitalized in server but not in client, leading to mismatches when logging in.


### Upcoming features:
* Help menu and help tooltips throughout app
* Better support for screen readers
* Ability to assign gifts manually rather than randomly
* Ability to add members to your group without resetting the group.

