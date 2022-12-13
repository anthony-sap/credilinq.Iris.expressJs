const Joi = require('joi');

const dataType = ["1","2","3"];//{ JSON: 1, STRING: 2, FILE: 3 };
const paymentType = ["1","2","3"];//{ BankTransfer: 1, VirtualWallet: 2, WireTransfer: 3 };

exports.drawdownSchema = Joi.object({
    principal: Joi.number().greater(0).precision(6).required(),
    data: Joi.string().required(),
    duration: Joi.number().integer().required(),
    partnerCustomerId: Joi.string().required()
});

exports.disburseSchema = Joi.object({
    amount: Joi.number().greater(0).precision(6).required(),
    paymentType: Joi.string().required().valid(paymentType),    
    paymentInformation: Joi.string(),    
    dataType: Joi.string().required().valid(dataType),
    data: Joi.string(),
    note: Joi.string(),
    disbursedOn: Joi.date().iso().required(),
    files: Joi.array().items(Joi.string())
});

exports.repaymentSchema = Joi.object({
    amount: Joi.number().greater(0).precision(6).required(),
    paymentType: Joi.string().required().valid(paymentType),    
    dataType: Joi.string().required().valid(dataType),
    data: Joi.string(),
    note: Joi.string(),
    repaidOn: Joi.date().iso().required(),
    files: Joi.array().items(Joi.string())
});