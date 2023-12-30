// Router
const express = require("express");
const router = express.Router();

// Controllers
const userCntrl = require("./controllers/userCntrl.js");

// Validation functions
const validation = require("../middleware/joi_validation.js");


router.post(
    "/create",
    validation.validateUserCode,
    userCntrl.createUser
);

router.post(
    "/access",
    validation.validateUserCode,
    userCntrl.accessUser
);

router.post(
    "/find",
    validation.validateInputs,
    userCntrl.findUser
);


router.post(
    "/data",
    validation.validateInputs,
    userCntrl.getUserData
);


router.post(
    "/gift/new",
    validation.validateInputs,
    userCntrl.newGift
);


router.post(
    "/gift/edit",
    validation.validateInputs,
    userCntrl.editGift
);


router.post(
    "/gift/delete",
    validation.validateInputs,
    userCntrl.deleteGift
);


router.post(
    "/gift/buy",
    validation.validateInputs,
    userCntrl.buyGift
);


router.post(
    "/note/create",
    validation.validateInputs,
    userCntrl.createNote
);


router.post(
    "/note/delete",
    validation.validateInputs,
    userCntrl.deleteNote
);


module.exports = router;