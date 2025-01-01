"use strict";
/**
 * Tokenizer spec.
 */
//TODO properly type Parsed
const TokenizerSpecs = [
    //White Space
    { expression: /^\s+/, type: null },
    //Comments
    //Single Line Comment
    { expression: /^\/\/.*/, type: null },
    //Multi Line Comment
    { expression: /^\/\*[\s\S]*?\*\//, type: null },
    //Numbers
    { expression: /^\d+/, type: 'NUMBER' },
    //Strings
    { expression: /^"[^"]*"/, type: 'STRING' },
    { expression: /^'[^']*'/, type: 'STRING' },
    //Keywords
    { expression: /^if/, type: 'IF' },
    { expression: /^else/, type: 'ELSE' },
    { expression: /^while/, type: 'WHILE' },
    { expression: /^function/, type: 'FUNCTION' },
    //Operators
    { expression: /^((&&)|(\|\|))/, type: "ANDOR_OPERATOR" },
    { expression: /^((==)|(!=)|(<=)|(>=)|[><])/, type: "EQUALITY_OPERATOR" },
    { expression: /^[+-]/, type: "ADDITIVE_OPERATOR" },
    { expression: /^[*/]/, type: "MULTIPLICATIVE_OPERATOR" },
    //Symbols
    { expression: /^;/, type: 'SEP' },
    { expression: /^\(/, type: "PAREN_OPEN" },
    { expression: /^\)/, type: "PAREN_CLOSE" },
    { expression: /^\{/, type: "BRACKET_OPEN" },
    { expression: /^}/, type: "BRACKET_CLOSE" },
    { expression: /^!/, type: "NOT" },
    { expression: /^=/, type: "ASSIGNMENT" },
    { expression: /^,/, type: "COMMA" },
    //Types
    { expression: /^int/, type: 'TYPE' },
    { expression: /^float/, type: 'TYPE' },
    { expression: /^string/, type: 'TYPE' },
    //IDENTIFIER
    { expression: /^[a-zA-Z_]\w*/, type: "IDENTIFIER" },
];
class Tokenizer {
    constructor() {
        this._string = "";
        this._cursor = 0;
    }
    init(code) {
        this._string = code;
        this._cursor = 0;
    }
    isEOF() {
        return this._cursor === this._string.length;
    }
    hasMoreTokens() {
        return this._cursor < this._string.length;
    }
    _match(regex0, string) {
        const matched = regex0.exec(string);
        if (matched == null) {
            return null;
        }
        this._cursor += matched[0].length;
        return matched[0];
    }
    getNextToken() {
        if (!this.hasMoreTokens()) {
            //throw new Error("ParserError: no more tokens");
            return null;
        }
        const cur_string = this._string.slice(this._cursor);
        console.log(cur_string);
        for (const spec of TokenizerSpecs) {
            const tokenValue = this._match(spec.expression, cur_string);
            //Don't match this rule, continue.
            if (tokenValue == null) {
                continue;
            }
            // Should skip white space and comments
            if (spec.type == null) {
                return this.getNextToken();
            }
            return {
                type: spec.type,
                value: tokenValue
            };
        }
        throw new SyntaxError(`Unexpected token: "${cur_string[0]}"`);
    }
}
class CodeParser {
    constructor(tokenizer) {
        this._lookahead = { type: "", value: "" };
        if (tokenizer) {
            this.tokenizer = tokenizer;
        }
        else {
            this.tokenizer = new Tokenizer();
        }
    }
    parse(code) {
        this.tokenizer.init(code);
        this._lookahead = this.tokenizer.getNextToken();
        return this.Program();
    }
    _eat(tokenType) {
        const token = this._lookahead;
        if (token == null) {
            throw new SyntaxError(`Unexpected end of input, expected: "${tokenType}"`);
        }
        if (token.type !== tokenType) {
            throw new SyntaxError(`Unexpected token: ${token.value}, expected: "${tokenType}"`);
        }
        this._lookahead = this.tokenizer.getNextToken();
        return token;
    }
    Program() {
        return {
            type: "Program",
            body: this.Lines()
        };
    }
    Lines() {
        var _a;
        const lines = [];
        while (!this.tokenizer.isEOF() && ((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) != "BRACKET_CLOSE") {
            lines.push(this.Line());
        }
        return {
            type: "Lines",
            body: lines
        };
    }
    Line() {
        let statement;
        if (this._lookahead == null) {
            throw new Error("Expected Token");
        }
        if (this._lookahead.type == "IF") {
            statement = this.If();
        }
        else if (this._lookahead.type == "WHILE") {
            statement = this.While();
        }
        else if (this._lookahead.type == "FUNCTION") {
            return this.FunctionDefinition();
        }
        else if (this._lookahead.type == "TYPE") {
            return this.VariableCreation();
        }
        else {
            statement = this.ExpressionStatement();
        }
        return {
            type: "Line",
            statement: statement
        };
    }
    If() {
        var _a, _b;
        this._eat('IF');
        const condition = this.Paren();
        let code;
        let type = "SINGLE_LINE_IF";
        if (((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) == "BRACKET_OPEN") {
            type = "MULTI_LINE_IF";
            this._eat('BRACKET_OPEN');
            code = this.Lines();
            this._eat('BRACKET_CLOSE');
        }
        else {
            code = this.Line();
        }
        let _else;
        if (((_b = this._lookahead) === null || _b === void 0 ? void 0 : _b.type) == "ELSE") {
            _else = this.Else();
        }
        return {
            type: type,
            condition: condition,
            body: code,
            else: _else
        };
    }
    Else() {
        var _a;
        this._eat('ELSE');
        let code;
        let type = "SINGLE_LINE_ELSE";
        if (((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) == "BRACKET_OPEN") {
            type = "MULTI_LINE_ELSE";
            this._eat('BRACKET_OPEN');
            code = this.Lines();
            this._eat('BRACKET_CLOSE');
        }
        else {
            code = this.Line();
        }
        return {
            type: type,
            body: code,
        };
    }
    While() {
        var _a;
        this._eat('WHILE');
        let code;
        let type = "SINGLE_LINE_WHILE";
        if (((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) == "BRACKET_OPEN") {
            type = "MULTI_LINE_WHILE";
            this._eat('BRACKET_OPEN');
            code = this.Lines();
            this._eat('BRACKET_CLOSE');
        }
        else {
            code = this.Line();
        }
        return {
            type: type,
            body: code,
        };
    }
    ExpressionStatement() {
        console.log(this._lookahead, "look");
        const expression = this.Expression();
        this._eat('SEP');
        return {
            type: "ExpressionStatement",
            expression: expression
        };
    }
    Expression() {
        return this.AndOrExpression();
    }
    AndOrExpression() {
        let left = this.EqualityExpression();
        while (this._lookahead != null && this._lookahead.type === 'ANDOR_OPERATOR') {
            const operator = this._eat("ANDOR_OPERATOR");
            const right = this.EqualityExpression();
            left = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: left,
                right: right
            };
        }
        return left;
    }
    EqualityExpression() {
        let left = this.AdditiveExpression();
        while (this._lookahead != null && this._lookahead.type === 'EQUALITY_OPERATOR') {
            const operator = this._eat("EQUALITY_OPERATOR");
            const right = this.AdditiveExpression();
            left = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: left,
                right: right
            };
        }
        return left;
    }
    AdditiveExpression() {
        let left = this.MultiplicativeExpression();
        while (this._lookahead != null && this._lookahead.type === 'ADDITIVE_OPERATOR') {
            const operator = this._eat("ADDITIVE_OPERATOR");
            const right = this.MultiplicativeExpression();
            left = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: left,
                right: right
            };
        }
        return left;
    }
    MultiplicativeExpression() {
        let left = this.Primary();
        while (this._lookahead != null && this._lookahead.type === 'MULTIPLICATIVE_OPERATOR') {
            const operator = this._eat("MULTIPLICATIVE_OPERATOR");
            const right = this.Primary();
            left = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: left,
                right: right
            };
        }
        return left;
    }
    Primary() {
        if (this._lookahead != null) {
            if (this._lookahead.type == "PAREN_OPEN") {
                return this.Paren();
            }
            else if (this._lookahead.value == "-") {
                return this.NEGATE();
            }
            else if (this._lookahead.type == "NOT") {
                return this.NOT();
            }
            else if (this._lookahead.type == "IDENTIFIER") {
                return this.Identifier();
            }
            return this.Literal();
        }
    }
    Paren() {
        this._eat("PAREN_OPEN");
        const value = this.Expression();
        this._eat("PAREN_CLOSE");
        return {
            type: "Parentheses",
            inner: value
        };
    }
    NOT() {
        this._eat("NOT");
        return {
            type: "Not",
            inner: this.Primary()
        };
    }
    NEGATE() {
        this._eat("ADDITIVE_OPERATOR");
        return {
            type: "Negate",
            inner: this.Primary()
        };
    }
    VariableDeclaration() {
        const type = this._eat("TYPE").value;
        const name = this._eat("IDENTIFIER").value;
        return {
            name: name,
            type: type,
        };
    }
    ParameterDeclaration() {
        return this.VariableDeclaration();
    }
    FunctionDefinition() {
        var _a, _b;
        this._eat("FUNCTION");
        const name = this._eat("IDENTIFIER").value;
        const params = [];
        this._eat("PAREN_OPEN");
        while (((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) != "PAREN_CLOSE") {
            params.push(this.ParameterDeclaration());
            if (((_b = this._lookahead) === null || _b === void 0 ? void 0 : _b.type) != "PAREN_CLOSE") {
                this._eat("COMMA");
            }
        }
        this._eat("PAREN_CLOSE");
        this._eat("BRACKET_OPEN");
        const code = this.Lines();
        this._eat("BRACKET_CLOSE");
        return {
            type: "FunctionDefinition",
            name: name,
            parameters: params,
            code: code
        };
    }
    Identifier() {
        var _a, _b;
        const variable = this.Variable();
        if (((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) == "PAREN_OPEN") {
            return this.FunctionCall(variable);
        }
        if (variable.member_access == undefined && ((_b = this._lookahead) === null || _b === void 0 ? void 0 : _b.type) == "ASSIGNMENT") {
            return this.VariableAssignment(variable);
        }
        return variable;
    }
    FunctionCall(identifier) {
        var _a, _b;
        this._eat("PAREN_OPEN");
        const parameters = [];
        while (((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) != "PAREN_CLOSE") {
            parameters.push(this.Expression());
            if (((_b = this._lookahead) === null || _b === void 0 ? void 0 : _b.type) != "PAREN_CLOSE") {
                this._eat("COMMA");
            }
        }
        this._eat("PAREN_CLOSE");
        return {
            type: "FunctionCall",
            name: identifier.value,
            parameters: parameters
        };
    }
    Variable() {
        var _a;
        let type = "Variable";
        const identifier = this._eat("IDENTIFIER");
        let member_access;
        if (((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) == "PERIOD") {
            type = "MemberAccess";
            this._eat("PERIOD");
            member_access = this.Variable();
        }
        return {
            type: type,
            value: identifier.value,
            member_access: member_access
        };
    }
    VariableCreation() {
        var _a;
        const declaration = this.VariableDeclaration();
        let assignment;
        if (((_a = this._lookahead) === null || _a === void 0 ? void 0 : _a.type) == "ASSIGNMENT") {
            this._eat("ASSIGNMENT");
            assignment = this.ExpressionStatement();
        }
        else {
            this._eat("SEP");
        }
        return {
            type: "VariableCreation",
            declaration: declaration,
            assignment: assignment
        };
    }
    VariableAssignment(variable) {
        this._eat("ASSIGNMENT");
        const expression = this.Expression();
        return {
            type: "VariableAssignment",
            variable: variable,
            value: expression
        };
    }
    Literal() {
        if (this._lookahead != null) {
            switch (this._lookahead.type) {
                case "NUMBER":
                    return this.NumericLiteral();
                case "STRING":
                    return this.StringLiteral();
            }
        }
        throw new SyntaxError(`Literal: unexpected literal production`);
    }
    NumericLiteral() {
        const token = this._eat('NUMBER');
        return {
            type: "NumericLiteral",
            value: Number(token.value)
        };
    }
    StringLiteral() {
        const token = this._eat('STRING');
        return {
            type: "StringLiteral",
            value: token.value.slice(1, -1)
        };
    }
}