// Router
const express = require("express");
const router = express.Router();

// Controllers
const homeCntrl = require('./controllers/homeCnrtl.js')

// Validation functions
const validation = require("../middleware/joi_validation.js");

router.post(
    "/new",
    validation.validateGroup,
    homeCntrl.newGroup
);



router.post(
    "/open",
    validation.validateGroup,
    homeCntrl.openGroup
);


module.exports = router;