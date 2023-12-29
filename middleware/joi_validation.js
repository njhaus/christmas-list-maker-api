const Joi = require("joi");

// validate new group
const groupSchema = Joi.object({
  title: Joi.string()
    .min(4)
    .max(30)
    .pattern(new RegExp(/[<>&"';*]/), { invert: true })
    .required(),
  code: Joi.string()
    .min(6)
    .max(20)
    .pattern(new RegExp(/[<>&"';*\s]/), { invert: true })
    .required(),
}).options({ allowUnknown: true });

const validateGroup = async(req, res, next) => {
    const body = req.body;
    console.log(body)
    try {
        const valid = await groupSchema.validateAsync(body);
        if (valid) {
            next();
        }
    } catch (err) {
        console.log(err)
        return res.send({error: "Group name must be between 4-20 letters. Code must be between 6-20 characters with no spaces or invalid characters."})
    }
}

// validate new user code

const userCodeSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(30)
    .pattern(new RegExp(/[<>&"';*]/), { invert: true })
    .required(),
  code: Joi.string()
    .min(6)
    .max(20)
    .pattern(new RegExp(/[<>&"';*\s]/), { invert: true })
    .required(),
}).options({ allowUnknown: true });


const validateUserCode = async (req, res, next) => {
  const body = req.body;
  try {
    const valid = await userCodeSchema.validateAsync(body);
    if (valid) {
      next();
    }
  } catch (err) {
    console.log(err);
    return res.send({
      error:
        "Name must be between 4-20 letters. Code must be between 6-20 characters with no spaces or invalid characters.",
    });
  }
};

// validate everything else
const inputSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(30)
    .pattern(new RegExp(/[<>&"';*]/), { invert: true }),
  title: Joi.string()
    .min(4)
    .max(30)
    .pattern(new RegExp(/[<>&"';*]/), { invert: true }),
  giftDescription: Joi.string()
    .max(40)
    .pattern(new RegExp(/[<>&"';*]/), { invert: true }),
  link: Joi.string()
    .max(200)
        .pattern(new RegExp(/[<>&"';*]/), { invert: true })
    .allow(''),
  bought: Joi.boolean(),
  noteDescription: Joi.string()
    .max(100)
    .pattern(new RegExp(/[<>&"';*]/), { invert: true }),
    users: Joi.array()
        .items(Joi.object({
            name: Joi.string()
                .min(2)
                .max(30)
                .pattern(new RegExp(/[<>&"';*]/), { invert: true }),
            recipients: Joi.array().items(
                Joi.string()
                    .min(2)
                    .max(30)
                    .pattern(new RegExp(/[<>&"';*]/), { invert: true })
            ),
  })),
}).options({ allowUnknown: true });


const validateInputs = async (req, res, next) => {
    const body = req.body;
    console.log("validating!")
    console.log(body)
  try {
    const valid = await inputSchema.validateAsync(body);
      if (valid) {
        console.log('validated!')
      next();
    }
  } catch (err) {
    console.log(err);
    return res.send({
      error:
        "Invalid values detected. Please re-input your information and try again.",
    });
  }
};


module.exports = {
    validateGroup,
    validateUserCode,
    validateInputs
}