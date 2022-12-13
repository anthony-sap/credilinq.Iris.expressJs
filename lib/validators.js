const Joi = require('joi');


exports.drawdownSchema = Joi.object({
    principal: Joi.number().greater(0).precision(6).required(),
    data: Joi.string().required(),
    duration: Joi.number().integer().required(),
    partnerCustomerId: Joi.string().required()
});