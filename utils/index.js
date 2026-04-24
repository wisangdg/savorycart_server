const {
  createMongoAbility: Ability,
  AbilityBuilder,
} = require("@casl/ability");

/**
 * Mendapatkan token dari request
 * @param {Object} req - Request object
 * @returns {String} - Token
 */
function getToken(req) {
  if (!req.headers.authorization) {
    return null;
  }

  const token = req.headers.authorization.replace("Bearer ", "").trim();
  return token && token.length > 0 ? token : null;
}

/**
 * Definisi kebijakan akses untuk setiap role
 */
const policies = {
  guest(user, { can }) {
    can("read", "Product");
  },
  user(user, { can }) {
    can("view", "Order");
    can("create", "Order");
    can("read", "Order", { user_id: user._id });
    can("update", "User", { _id: user._id });
    can("read", "Cart", { user_id: user._id });
    can("update", "Cart", { user_id: user._id });
    can("create", "Cart", { user_id: user._id });
    can("delete", "Cart", { user_id: user._id });
    can("view", "DeliveryAddress");
    can("create", "DeliveryAddress", { user_id: user._id });
    can("update", "DeliveryAddress", { user_id: user._id });
    can("delete", "DeliveryAddress", { user_id: user._id });
    can("read", "Invoice", { user_id: user._id });
  },
  admin(user, { can }) {
    can("manage", "all");
  },
};

/**
 * Membuat policy berdasarkan user role
 * @param {Object} user - User object
 * @returns {Ability} - CASL Ability instance
 */
const policyFor = (user) => {
  const { can, rules } = new AbilityBuilder(Ability);

  const role = user && user.role ? user.role : "guest";

  if (policies[role]) {
    policies[role](user, { can });
  }

  return new Ability(rules);
};

module.exports = { getToken, policyFor };
