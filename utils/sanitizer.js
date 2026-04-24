/**
 * Utilitas untuk sanitasi input
 * Mencegah XSS dan injeksi berbahaya lainnya
 */

const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

// Inisialisasi DOMPurify dengan JSDOM
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitasi string untuk mencegah XSS
 * @param {string} input - String yang akan disanitasi
 * @param {boolean} allowRichText - Izinkan tag HTML tertentu untuk rich text
 * @returns {string} - String yang sudah disanitasi
 */
const sanitizeString = (input, allowRichText = false) => {
  if (typeof input !== "string") return input;

  const options = allowRichText
    ? {
        // Tag HTML yang diperbolehkan untuk rich text
        ALLOWED_TAGS: [
          "b",
          "i",
          "em",
          "strong",
          "p",
          "br",
          "ul",
          "ol",
          "li",
          "a",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "blockquote",
          "code",
          "pre",
        ],
        // Atribut yang diperbolehkan
        ALLOWED_ATTR: ["href", "target", "rel", "class"],
      }
    : {
        ALLOWED_TAGS: [], // Tidak mengizinkan tag HTML apapun
        ALLOWED_ATTR: [], // Tidak mengizinkan atribut HTML apapun
      };

  return DOMPurify.sanitize(input, options);
};

/**
 * Sanitasi objek secara rekursif
 * @param {object} obj - Objek yang akan disanitasi
 * @param {object} options - Opsi sanitasi
 * @param {string[]} options.richTextFields - Daftar field yang diizinkan berisi rich text
 * @returns {object} - Objek yang sudah disanitasi
 */
const sanitizeObject = (obj, options = { richTextFields: [] }) => {
  if (!obj || typeof obj !== "object") return obj;

  // Jika array, sanitasi setiap elemen
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  // Jika objek, sanitasi setiap properti
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      const allowRichText = options.richTextFields.includes(key);
      sanitized[key] = sanitizeString(value, allowRichText);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Middleware untuk sanitasi body request
 */
const sanitizeRequest = (req, res, next) => {
  // Daftar field yang diizinkan berisi rich text
  const richTextFields = [
    "description",
    "content",
    "longDescription",
    "details",
  ];

  if (req.body) {
    req.body = sanitizeObject(req.body, { richTextFields });
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeRequest,
};
