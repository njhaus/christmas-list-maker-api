// Router
const express = require("express");
const router = express.Router();

// Controllers
const listCntrl = require('./controllers/listCntrl.js');

// Validation functions
const validation = require("../middleware/joi_validation.js");

router.post(
    "/find",
    validation.validateInputs,
    listCntrl.findList
);


router.post(
    "/create",
    validation.validateInputs,
    listCntrl.createList
);


router.post("/recipients",
    validation.validateInputs,
    listCntrl.setRecipients);

module.exports = router;