const mongoose = require("mongoose");
const { model, Schema } = mongoose;

let tagSchema = Schema({
  name: {
    type: String,
    minlength: [3, "Panjang nama tag minimal 3 karakter"],
    maxlength: [30, "Panjang nama tag maksimal 30 karakter"],
    required: [true, "Nama tag harus diisi"],
  },
});

module.exports = model("Tag", tagSchema);
