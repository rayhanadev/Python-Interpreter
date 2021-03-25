const parse = require('./components/parser').Parse();
const lex = require('./components/lexer').Lex();
const evaluate = require('./components/eval').Eval();

const _debug = true;

function main() {
	var string;
	try {
		var tokens = lex('test.pyjs');
		var tree = parse(tokens);

		string = JSON.stringify(
			tree,
			[
				'key',
				'name',
				'message',
				'value',
				'arity',
				'first',
				'second',
				'third',
				'fourth'
			],
			4
		);
		if(_debug) console.log(string);
		evaluate(tree);
	} catch (err) {
		string = JSON.stringify(
			err,
			[
				'name',
				'message',
				'from',
				'to',
				'key',
				'value',
				'arity',
				'first',
				'second',
				'third',
				'fourth'
			],
			4
		);
		console.log(string);
	}
}

main();
