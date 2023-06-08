require('dotenv').config();
require('./rootRequire');

module.exports = {
    ...require('./start'),
    ...require('./deploy'),
    ...require('./deployMainCode'),
    ...require('./execute'),
    ...require('./setProxy'),
    ...require('./utils'),
};
