//@ts-check
const nodemailer = require('nodemailer');

const {
    prepareFunction,
    payPalIpnValidate,
    payPalIpnToOrder,
    getEnv,
    sendEmailWithMailgen,
    getEmptyFunctionResult,
    getErrorFunctionResult,
    log_event_information,
    log_event_sale,
    log_event_error,
} = require('ampsalesfunnels-functions');

function getTransporter(production) {
    const transporter = nodemailer.createTransport({
        service: 'SendinBlue', // no need to set host or port etc.
        auth: {
            user: getEnv('SMTP_USERNAME', production),
            pass: getEnv('SMTP_PASSWORD', production)
        }
    });
    return transporter;
}

exports.handler = async (event, context) => {
    let production = true; // assume production
    let name = 'unknown';
    let email = 'unknown';
    let sku = 'unknown';
    let price = 'unknown';
    try {
        prepareFunction(event, context, __dirname, [
            'SANDBOX_SMTP_EMAILSENDER', 'PRODUCTION_SMTP_EMAILSENDER',
            'SANDBOX_SMTP_USERNAME', 'PRODUCTION_SMTP_USERNAME',
            'SANDBOX_SMTP_PASSWORD', 'PRODUCTION_SMTP_PASSWORD'
        ]);
        console.log("BODY:", event.body);
        const order = payPalIpnToOrder(event.body);
        production = order.custom.production == 'true'? true : false;
        name = order.custom.name;
        email = order.custom.email;
        sku = order.item_number;
        price = `${order.mc_currency} ${order.mc_gross}`;
        await payPalIpnValidate(event.body, production);
        await sendEmailWithMailgen(getTransporter(production),
            getEnv('SMTP_EMAILSENDER', production), 
            email, 
            name, 
            sku, 
            `${__dirname}/products`);
        await log_event_information(production, 'paypal_ipn.js', name, email, event.body);
        await log_event_sale(production, name, email, sku, price);
        return getEmptyFunctionResult();
    } catch (error) {
        await log_event_error(production, 'paypal_ipn.js', name, email, error.toString());
        return getErrorFunctionResult(400, error);
    }
};