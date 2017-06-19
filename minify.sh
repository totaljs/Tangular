ECHO "[COMPILING]"
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd $DIR
uglifyjs Tangular.js --config-file minify.json -o Tangular.min.js