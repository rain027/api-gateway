const fs = require('fs')
const yaml = require('js-yaml');

function loadConfig(){
    const file = fs.readFileSync('./config.yaml','utf-8');
    return yaml.load(file)
}

module.exports = loadConfig();