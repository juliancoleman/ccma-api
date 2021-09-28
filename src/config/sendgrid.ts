import sgMail from '@sendgrid/mail';

/**
 * Email templates are created from within SendGrid's
 * template builder. As more are created, you can add new
 * keys to the email template map. The value must be a
 * string. If using environment variables, ensure that
 * undefined variables are coerced to strings.
 *
 * TODO: allow only the tags available on each template.
 */
export interface EmailTemplateMap {
  [key: string]: string;
}

/**
 * In order to send emails through SendGrid, you must at
 * least specify a template name (string) and a to-address.
 * All other keys are used for the dynamic_template_data
 * object.
 */
export interface SendEmailData {
  templateName: string;
  to: string;
  [key: string]: any;
}

const {
  SENDGRID_REGISTRATION_RECEIPT_EMAIL_TEMPLATE_ID = '',
  SENDGRID_API_KEY = undefined,
} = process.env;

const sendgridTemplates: EmailTemplateMap = {
  registration_receipt: SENDGRID_REGISTRATION_RECEIPT_EMAIL_TEMPLATE_ID,
};

let useSandboxMode = false;

if (typeof SENDGRID_API_KEY === 'string') {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.info('Connected to SendGrid');
} else {
  useSandboxMode = true;
  console.error(
    'Invalid SendGrid API key provided. Falling back to Sandbox mode. Emails will not be sent',
  );
}

export function sendEmail(data: SendEmailData) {
  const { templateName, to, ...dynamicTemplateData } = data;

  const msg: sgMail.MailDataRequired = {
    to,
    from: 'no-reply@centralcalmensadvance.com',
    dynamicTemplateData,
    templateId: sendgridTemplates[templateName],
    mailSettings: {
      sandboxMode: {
        enable: useSandboxMode,
      },
    },
  };

  return sgMail
    .send(msg)
    .then((response: [sgMail.ClientResponse, {}]) => {
      return response[0];
    })
    .catch(console.error);
}
