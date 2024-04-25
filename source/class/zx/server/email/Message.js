const fs = require("fs");
const path = require("path");

/**
 * @typedef EmailParameters
 * @property {String} from the email address to send from, if supported
 * @property {String} to the email address to send to
 * @property {String[]} cc the email addresses to CC
 * @property {String[]} bcc the email addresses to BCC
 * @property {String} subject the subject of the email
 * @property {String} priority the priority of the email
 * @property {Array<{ name: string; path: string; } | zx.server.email.Attachment>} attachments the attachments to send
 */

/**
 * An email message that is queued for sending
 */
qx.Class.define("zx.server.email.Message", {
  extend: zx.server.Object,

  statics: {
    /**
     * Composes an email message and saves it in the queue
     * @param {{ parameters?: EmailParameters; textBody?: string; htmlBody?: string; }} params
     * @returns {zx.server.email.Message}
     */
    async compose({ parameters, textBody, htmlBody }) {
      let email = new zx.server.email.Message().set({ ...parameters, textBody, htmlBody, dateQueued: new Date() });
      await email.save();
      return email;
    }
  },

  properties: {
    /**
     * Date when the email was put into the queue
     */
    dateQueued: {
      check: "Date",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeDateQueued"
    },

    /**
     * From email address
     */
    from: {
      check: "String",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeFrom",
      nullable: true,
      init: null
    },

    /**
     * To email address(es)
     * @type {qx.data.Array<string>} read value
     * @type {qx.data.Array<string> || string[] || string || null} accepted incoming values
     */
    to: {
      transform: "__ensureQxArray",
      check(value) {
       return this.__isStringArray(value);
      },
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeTo"
    },

    /**
     * CC email address(es)
     * @type {qx.data.Array<string>} read value
     * @type {qx.data.Array<string> || string[] || string || null} accepted incoming values
     */
    cc: {
      transform: "__ensureQxArray",
      check(value) {
        return this.__isStringArray(value);
      },
      init: null,
      nullable: true,
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeCc"
    },

    /**
     * BCC email address(es)
     * @type {qx.data.Array<string>} read value
     * @type {qx.data.Array<string> || string[] || string || null} accepted incoming values
     */
    bcc: {
      transform: "__ensureQxArray",
      check(value) {
        return this.__isStringArray(value);
      },
      init: null,
      nullable: true,
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeBcc"
    },

    /**
     * Email subject
     */
    subject: {
      check: "String",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeSubject"
    },

    /**
     * HTML body of the email
     */
    htmlBody: {
      check: "String",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeHtmlBody",
      init: null,
      nullable: true
    },

    /**
     * Text body of the email
     */
    textBody: {
      check: "String",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeTextBody",
      init: null,
      nullable: true
    },

    /**
     * Attachments for the email
     * @type {qx.data.Array<zx.server.email.Attachment>}
     */
    attachments: {
      check: "qx.data.Array",
      "@": [zx.io.persistence.anno.Property.EMBED, zx.io.remote.anno.Property.PROTECTED],
      event: "changeAttachments",
      init: null,
      nullable: true
    },

    /**
     * Number of times the email was attempted to be sent
     */
    sendAttempts: {
      check: "Integer",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeSendAttempts",
      init: 0
    },

    /**
     * Last error message if the email was not sent
     */
    lastErrorMessage: {
      check: "String",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      event: "changeLastErrorMessage",
      init: null,
      nullable: true
    }
  },

  members: {
    /* PROPERTY CHECK/TRANSFORM */
    __isStringArray(value) {
      return value instanceof qx.data.Array && value.every(v => typeof v === "string");
    },
    __isAttachmentArray(value) {
      return value instanceof qx.data.Array && value.every(v => v instanceof zx.server.email.Attachment);
    },
    __ensureQxArray(value) {
      if (!Array.isArray(value) && !(value instanceof qx.data.Array) && value !== null) {
        value = [value];
      }
      if (Array.isArray(value)) {
        return new qx.data.Array(value);
      }
      return value;
    },

    /**
     * @returns {boolean} If the email was successfully sent
     */
    async sendEmail() {
      let htmlBody = this.getHtmlBody();

      let config = await zx.server.Config.getConfig();

      let attachmentsData = [{ data: htmlBody, alternative: true }];
      if (this.getAttachments()) {
        let mime = (await import("mime")).default;
        this.getAttachments().forEach(attachment => {
          let filename = attachment.getPath();
          let stream = fs.createReadStream(filename);
          let attachmentData = {};
          if (stream) {
            attachmentData.stream = stream;
          } else {
            attachmentData.path = filename;
          }

          let fileExt = path.extname(filename);
          if (fileExt.startsWith(".")) {
            fileExt = fileExt.substring(1);
            let mimeType = mime.getType(fileExt);
            if (mimeType) {
              attachmentData.type = mimeType;
            }
          }

          attachmentData.name = attachment.getName() || path.basename(filename);
          attachmentsData.push(attachmentData);
        });
      }

      let message = zx.server.email.EmailJS.createNewMessage({
        from: config.smtpServer.fromAddr,
        to: this.getTo(),
        cc: this.getCc(),
        bcc: this.getBcc(),
        subject: this.getSubject(),
        attachment: attachmentsData,
        text: this.getTextBody(),
        ...(this.getFrom() ? { "reply-to": this.getFrom() } : {})
      });

      let client = zx.server.email.SMTPClient.getSmtpClientImpl();
      let error = false;

      try {
        await client.sendAsync(message);
      } catch (err) {
        error = true;
        if (!(message instanceof zx.server.email.Message)) {
          let server = zx.server.Standalone.getInstance();
          message = await server.findOneObjectByType(zx.server.email.Message, { _uuid: this.toUuid() });
        }
        this.setSendAttempts(this.getSendAttempts() + 1);
        this.setLastErrorMessage(err ? err.message : null);
        this.save();
      }

      return !error;
    }
  }
});
