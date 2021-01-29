/* description: Parses end executes mathematical expressions. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
[A-Z][0-9|a-z]*  return 'ID'
"*"                   return '*'
"+"                   return '+'
"^"                   return '^'
"'"                   return "'"
"("                   return '('
")"                   return ')'
"1"                   return '1'
"0"                   return '0'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%left '+'
%left '*'
%left '^'
%right "'"

%start expressions

%% /* language grammar */

expressions
    : e EOF
        { return $1; }
    ;

e
    : e '+' e
        {$$ = ['or',$1,$3];}
    | e '*' e
        {$$ = ['and',$1,$3];}
    | e '^' e
        {$$ = ['xor',$1,$3];}
    | e "'"
        {$$ = ['not',$1];}
    | '(' e ')'
        {$$ = $2;}
    | ID
        {$$ = yytext;}
    | '0'
        {$$ = false;}
    | '1'
        {$$ = true;}
    ;

