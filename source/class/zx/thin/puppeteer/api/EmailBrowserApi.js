/**
 * API for the browser to send emails
 *
 * This class needs to be instantiated in the browser, and then you add code so that when the `start` event
 * is fired, you create the HTML email and call `sendEmail` with the HTML and parameters.
 *
 * When the `next` event is fired, you should either send the next email (via a call to `sendEmail`) or call
 * `complete` to finish.
 */
qx.Class.define("zx.thin.puppeteer.api.EmailBrowserApi", {
  extend: zx.io.api.AbstractServerApi,

  construct() {
    super("zx.server.puppeteer.api.EmailApi");
  },

  events: {
    /** Fired when we want the webpage to render the next email, or return null when there are no more emails to render */
    next: "qx.event.type.Event"
  },

  members: {
    /**@override */
    _publications: {
      /**
       * Tell the client to pull the email from the page and send the email
       */
      sendEmail: {}
    },
    /**
     * REMOTE METHOD
     */
    next() {
      this.fireEvent("next");
    },

    /**
     * Sends an email
     *
     * @param {String} htmlBody the HTML of the email to send
     * @param {String} textBody the text body of the email to send
     * @param {EmailParameters} parameters see {@link zx.server.email.Message}
     */
    sendEmail(htmlBody, textBody, parameters) {
      this.publish("sendEmail", { htmlBody, textBody, parameters });
    },

    /**
     * Inlines all styles in the page in preparation for sending as HTML email;
     * removes script, style, and link tags.  After this has run, document.body.innerHTML
     * can be used verbatim in HTML emails.
     */
    inlineStylesForEmail: function (doc) {
      qx.html.Element.flush();
      doc = doc || document;
      var body = doc.body;

      var rules;
      for (var i = 0; i < doc.styleSheets.length; i++) {
        if (doc.styleSheets[i].cssRules) {
          rules = doc.styleSheets[i].cssRules;
        } else if (doc.styleSheets[i].rules) {
          rules = doc.styleSheets[i].rules;
        }

        for (var idx = 0, len = rules.length; idx < len; idx++) {
          if (rules[idx].selectorText) {
            if (rules[idx].selectorText.indexOf("hover") == -1) {
              let match = qx.bom.Selector.query(rules[idx].selectorText, doc);
              match.forEach(elem => {
                var str = rules[idx].style.backgroundImage;
                if (str) {
                  var updated = str.replace(/url\(([^\)]+)\)/g, function (full, path) {
                    path = path.replace(/^\"([^"]*)\"$/, "$1"); // Strip quotes
                    if (!path.match(/^https?/)) {
                      if (!path.match(/^\//)) {
                        var tmp = doc.location.pathname;
                        var pos = tmp.lastIndexOf("/");
                        if (pos > -1) {
                          tmp = tmp.substring(0, pos + 1);
                        }
                        path = tmp + path;
                      }
                      path = doc.location.origin + path;
                    }
                    return 'url("' + path + '")';
                  });
                  rules[idx].style.backgroundImage = updated;
                }

                var style = rules[idx].style.cssText;

                style = style.replace(/[a-z0-9-]+: inherit;/g, "");
                style = elem.style.cssText + style;
                elem.style.cssText = style;
              });
            }
          }
        }
      }

      qx.bom.Selector.query("img", body).forEach(img => {
        console.log("img src=" + this.src);
        this.src = "" + this.src;
      });

      const remove = element => element.parentNode.removeChild(element);

      qx.bom.Selector.query("div[style*='display:none'],nav[style*='display:none'],header[style*='display:none'],footer[style*='display:none']", body).forEach(remove);
      qx.bom.Selector.query("style", body).forEach(remove);
      qx.bom.Selector.query("script", body).forEach(remove);
      qx.bom.Selector.query("link", body).forEach(remove);
    }
  }
});
