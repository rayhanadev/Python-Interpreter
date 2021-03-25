exports.Lex = function() {
	var fs = require('fs');
	var lex = function(input) {
		var tokens = [],
			c,
			i = 0,
			TotalOfIndent = 0,
			lines = 1;

		var advance = function() {
			return (c = input[++i]);
		};
		var addToken = function(type, value) {
			tokens.push({
				type: type,
				value: value
			});
		};

		var isOperator = function(c, opr) {
				if (!opr) {
					return /[+\-*\/\^%=(),:.!<>\[\]\{\}]/.test(c);
				} else if (/[!=+\-*\/\^%<>]/.test(opr)) {
					return /[=]/.test(c);
				} else {
					return false;
				}
			},
			isDigit = function(c, mode = false) {
				if (mode == false) return /[0-9]/.test(c);
				else if (mode == true) return /[0-9.]/.test(c);
			},
			isWhiteSpace = function(c) {
				return /\s/.test(c);
			},
			isWord = function(c) {
				return typeof c === 'string' && !isOperator(c) && !isWhiteSpace(c);
			},
			isNewline = function(c) {
				return /\n/.test(c);
			},
			isIndentation = function(c) {
				return /\t/.test(c);
			},
			isString = function(c, mode = '') {
				if (mode == '') return /['"]/.test(c);
				else if (mode == "'") return /[']/.test(c);
				else if (mode == '"') return /["]/.test(c);
			},
			isComment = function(c) {
				return /[#]/.test(c);
			};

		var isCorrectNumber = function(num) {
			var numOfDot = 0;
			for (var count = 0; count < num.length; count++)
				if (num[count] == '.') numOfDot++;
			if (numOfDot > 1) return false;
			else return true;
		};

		while (i < input.length) {
			c = input[i];

			if (isNewline(c)) {
				lines++;
				addToken('CONTROL', 'newline');
				advance();

				var subOfIndent = 0;
				while (isIndentation(c)) {
					subOfIndent++;
					advance();
				}
				while (subOfIndent > TotalOfIndent) {
					addToken('CONTROL', 'indent');
					TotalOfIndent++;
				}
				while (subOfIndent < TotalOfIndent) {
					addToken('CONTROL', 'dedent');
					TotalOfIndent--;
				}
				while (isNewline(c) || isIndentation(c) || isWhiteSpace(c)) {
					advance();
				}
			} else if (isWhiteSpace(c)) {
				advance();
			} else if (isOperator(c)) {
				var opr = c;
				while (isOperator(advance(), opr)) opr += c;
				addToken('OPERATOR', opr);
			} else if (isString(c)) {
				var str = c;
				var mode = c;
				while (!isString(advance(), mode) && i < input.length) str += c;
				if (i >= input.length) throw 'String error in line ' + lines;
				str += c;
				addToken('STRING', str.substring(1, str.length - 1));
				advance();
			} else if (isDigit(c)) {
				var num = c;
				while (isDigit(advance(), true)) num += c;
				if (!isCorrectNumber(num))
					throw 'Error number ' + num + ' in line ' + lines;
				addToken('NUMBER', Number(num));
			} else if (isComment(c)) {
				while (!isNewline(c) && i < input.length) {
					advance();
				}
			} else if (isWord(c)) {
				var word = c;
				while (isWord(advance())) word += c;
				addToken('IDENTIFIER', word);
			} else throw 'Unrecognized token.';
		}
		if (tokens[tokens.length - 1].value != 'newline') {
			addToken('CONTROL', 'newline');
		}
		while (TotalOfIndent > 0) {
			addToken('CONTROL', 'dedent');
			TotalOfIndent--;
		}
		addToken('CONTROL', 'end');
		return tokens;
	};

	return function(fileName) {
		let data = fs.readFileSync(fileName);
		let result = lex(data.toString());
		return result;
	};
};
