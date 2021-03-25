in_array = function(array, e) {
	for (var i = 0; i < array.length && array[i] !== e; i++);
	return !(i === array.length);
};

exports.Eval = function() {
	var scope;

	var original_scope = {
		find_v: function(id) {
			var e = this,
				o;
			while (true) {
				o = e.v[id];
				if (o) {
					return o;
				}
				e = e.parent;
				if (!e) {
					return null;
				}
			}
		},
		find_f: function(id) {
			var e = this,
				o;
			while (true) {
				o = e.f[id];
				if (o) {
					return o;
				}
				e = e.parent;
				if (!e) {
					throw 'Undefined function ' + id + '()';
				}
			}
		},
		def_f: function(id, value) {
			var o = this.f[id];
			if (o) {
				throw 'Redefine function ' + id + '()';
			}
			this.f[id] = { id: id, value: value };
			return this.f[id];
		},
		def_v: function(id, value) {
			this.v[id] = { id: id, value: value };
			return this.v[id];
		},
		pop: function() {
			scope = this.parent;
		}
	};

	var new_scope = function() {
		var s = scope;
		scope = Object.create(original_scope);
		scope.v = {};
		scope.f = {};
		scope.parent = s;

		scope.v['__CONTROL'] = { id: '__CONTROL', value: null };
		scope.v['__rtn'] = { id: '__rtn', value: undefined };

		return scope;
	};

	var matchEval = function(tree) {
		switch (tree.arity) {
			case 'binary':
				return eval_bina(tree);
			case 'ternary':
				return eval_terna(tree);
			case 'unary':
				return eval_una(tree);
			case 'statement':
				return eval_stmt(tree);
			case 'name':
				return scope.find_v(tree.value);
			case 'fname':
				return scope.find_f(tree.value);
			case 'literal':
				return tree.value;
			default:
				throw 'Unknown arity: ' + tree.arity;
		}
	};

	var eval_stmts = function(tree) {
		for (var i = 0; i < tree.length; i++) {
			matchEval(tree[i]);
			if (
				scope.find_v('__CONTROL').value === 'BREAK' ||
				scope.find_v('__CONTROL').value === 'CONTINUE'
			) {
				break;
			}
		}
	};

	var eval_bina = function(tree) {
		switch (tree.value) {
			case '+':
				return getValue(tree.first) + getValue(tree.second);
			case '-':
				return getValue(tree.first) - getValue(tree.second);
			case '*':
				return getValue(tree.first) * getValue(tree.second);
			case '/':
				return getValue(tree.first) / getValue(tree.second);
			case '%':
				return getValue(tree.first) % getValue(tree.second);
			case '&&':
				return getValue(tree.first) && getValue(tree.second);
			case '||':
				return getValue(tree.first) || getValue(tree.second);
			case '==':
				return getValue(tree.first) === getValue(tree.second);
			case '!=':
				return getValue(tree.first) !== getValue(tree.second);
			case '<=':
				return getValue(tree.first) <= getValue(tree.second);
			case '>=':
				return getValue(tree.first) >= getValue(tree.second);
			case '<':
				return getValue(tree.first) < getValue(tree.second);
			case '>':
				return getValue(tree.first) > getValue(tree.second);
			case '=':
				if (matchEval(tree.first) === null) {
					scope.def_v(tree.first.value, 0);
				}
				return (matchEval(tree.first).value = getValue(tree.second));
			case '+=':
				if (matchEval(tree.first) === null) {
					throw 'Undefined variable ' + tree.first.value;
				}
				return (matchEval(tree.first).value += getValue(tree.second));
			case '-=':
				if (matchEval(tree.first) === null) {
					throw 'Undefined variable ' + tree.first.value;
				}
				return (matchEval(tree.first).value -= getValue(tree.second));
			case '[':
				return getValue(tree.first)[getValue(tree.second)];
			case 'in':
				return in_array(getValue(tree.second), getValue(tree.first));
			case '(':
				return eval_func(tree);
			default:
				throw 'Unknown operator: ' + tree.value;
		}
	};

	var eval_func = function(tree) {
		var func = matchEval(tree.first).value;
		var args = [];
		for (var i = 0; i < tree.second.length; i++) {
			args.push(getValue(tree.second[i]));
		}
		return func(args);
	};

	var eval_terna = function(tree) {
		switch (tree.value) {
			case '?':
				return getValue(tree.first)
					? getValue(tree.second)
					: getValue(tree.third);
			default:
				throw 'Unknown operator: ' + tree.value;
		}
	};

	var eval_una = function(tree) {
		var list = [];
		var dic = {};
		switch (tree.value) {
			case '!':
				return !getValue(tree.first);
			case '-':
				return -getValue(tree.first);
			case '[':
				for (var i = 0; i < tree.first.length; i++) {
					list.push(getValue(tree.first[i]));
				}
				return list;
			case '{':
				for (var i = 0; i < tree.first.length; i++) {
					dic[tree.first[i].key] = getValue(tree.first[i]);
				}
				return dic;
			default:
				throw 'Unknown operator: ' + tree.value;
		}
	};

	var eval_stmt = function(tree) {
		switch (tree.value) {
			case 'def':
				return eval_def(tree);
			case 'while':
				return eval_while(tree);
			case 'if':
				return eval_if(tree);
			case 'for':
				return eval_for(tree);
			case 'break':
				return eval_break(tree);
			case 'continue':
				return eval_continue(tree);
			case 'return':
				return eval_return(tree);
			default:
				throw 'Unknown statement: ' + tree.value;
		}
	};

	var eval_def = function(tree) {
		var func = function(args) {
			var rtn;
			new_scope();
			for (var i = 0; i < tree.first.length; i++) {
				scope.def_v(tree.first[i].value, args[i]);
			}
			eval_stmts(tree.second);
			rtn = scope.find_v('__rtn').value;
			scope.pop();
			if (rtn !== undefined) {
				return rtn;
			}
		};
		scope.def_f(tree.name, func);
	};

	var eval_while = function(tree) {
		while (getValue(tree.first)) {
			new_scope();
			eval_stmts(tree.second);
			if (scope.find_v('__CONTROL').value === 'BREAK') {
				scope.pop();
				break;
			}
			scope.pop();
		}
	};

	var eval_if = function(tree) {
		if (getValue(tree.first)) {
			eval_stmts(tree.second);
		} else if (tree.third !== null) {
			if (tree.third.value === 'elif') {
				eval_if(tree.third);
			} else {
				eval_stmts(tree.third);
			}
		}
	};

	var eval_for = function(tree) {
		if (tree.first.value !== 'in') {
			throw 'Unknown for statement';
		}
		var o = getValue(tree.first.second);
		// for (var index = 0; index < o.length; index++) {
		for (var index in o) {
			new_scope();
			scope.def_v(tree.first.first.value, o[index]);
			eval_stmts(tree.second);
			if (scope.find_v('__CONTROL').value === 'BREAK') {
				scope.pop();
				break;
			}
			scope.pop();
		}
	};

	var eval_break = function(tree) {
		scope.def_v('__CONTROL', 'BREAK');
	};

	var eval_continue = function(tree) {
		scope.def_v('__CONTROL', 'CONTINUE');
	};

	var eval_return = function(tree) {
		var first = matchEval(tree.first);
		var value = first.value ? first.value : first;
		scope.find_v('__rtn').value = value;
	};

	var set_print = function() {
		var func = function(args) {
			if (args.length !== 1) {
				throw 'Unexpected arguments in print()';
			}
			console.log(args[0]);
		};
		scope.def_f('print', func);
	};

	// var set_input = function() {
	//     var func = function(args) {
	//         if (args !== null || args !== undefined) {
	//             throw("Unexpected arguments in input()");
	//         }
	//         var input = readlineSync.question();
	//         return input;
	//     }
	// }

	var set_range = function() {
		var func = function(args) {
			if (args.length === 1) {
				var list = [];
				for (var i = 0; i < args[0]; i++) {
					list.push(i);
				}
				return list;
			} else if (args.length < 4 && args.length > 1) {
				var list = [];
				var gap = args[2] ? args[2] : 1;
				for (var i = args[0]; i < args[1]; i += gap) {
					list.push(i);
				}
				return list;
			} else {
				throw 'Unexpected arguments in range()';
			}
		};
		scope.def_f('range', func);
	};

	var set_builtin = function() {
		set_print();
		set_range();
	};

	var getValue = function(tree) {
		var sec = matchEval(tree);
		if (sec === null) {
			throw 'Undefined variable ' + tree.value;
		} else if (sec.value === null || sec.value === undefined) {
			return sec;
		} else {
			return sec.value;
		}
	};

	return function(tree) {
		new_scope();
		set_builtin();
		eval_stmts(tree);
		scope.pop();
	};
};
