//@ts-check
const querystring = require('querystring');

const {
    prepareFunction,
    getPayPalProductUrl,
    getAMPRedirectToFunctionResult,
    getErrorFunctionResult,
    isProductionBasedOnHostname,
    log_event_information,
    log_event_interest,
    log_event_error,
} = require('ampsalesfunnels-functions');

exports.handler = async (event, context) => {
    let production = true; // assume production
    let name = 'unknown';
    let email = 'unknown';
    let sku = 'unknown';
    try {
        prepareFunction(event, context, __dirname);

        const { body, queryStringParameters } = event;

        // When an AMP form is posted, the body contains the fields in the format application/x-www-form-urlencoded.
        // This data is the same format as a querystring, so can be decoded using querystring.decode().
        let formData = querystring.decode(body);
        const file_stem = formData.file_stem;
        if (!file_stem) {
            throw new Error("Hidden form input 'file_stem' expected with file stem (basename) of executing AMP page");
        }
        const sku_base = formData.sku_base;
        if (!sku_base) {
            throw new Error("Hidden form input 'sku_base' expected with sku of the base product sold on AMP page");
        }

        const host = formData.host;
        if (!sku_base) {
            throw new Error("Hidden form input 'host' expected with host name of the server serving the AMP page");
        }

        production = isProductionBasedOnHostname(host);

        sku = formData.unlimitedRights === 'on' ? `${sku_base}unl` : sku_base.toString();
        sku = formData.trackouts === 'on' ? `${sku_base}unltrck` : sku;
        const siteUrl = queryStringParameters.__amp_source_origin || queryStringParameters.amp_source_origin;
        name = formData.name.toString();
        email = formData.email.toString();

        const simplifiedFormData = { name, email };
        const customData = { name, email, production };
        const payPalUrl = getPayPalProductUrl(
            sku,
            simplifiedFormData,
            customData,
            siteUrl,
            `/${file_stem}-thanks.html`,
            `/${file_stem}.html`,
            '/img/company-150x50.png',
            __dirname + '/products',
            production,
        );
        await log_event_information(production, 'producer_paypal_url.js', name, email, payPalUrl);
        await log_event_interest(production, name, email, sku);
        return getAMPRedirectToFunctionResult(payPalUrl);
    } catch (error) {
        await log_event_error(production, 'producer_paypal_url.js', name, email, error.toString());
        return getErrorFunctionResult(400, error);
    }
};
