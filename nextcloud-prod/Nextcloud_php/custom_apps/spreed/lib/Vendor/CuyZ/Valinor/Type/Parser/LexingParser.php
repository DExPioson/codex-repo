<?php

namespace OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser;

use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\TokensExtractor;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\TokenStream;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\TypeLexer;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Type;

/** @internal */
class LexingParser implements TypeParser
{
    public function __construct(private TypeLexer $lexer) {}

    public function parse(string $raw): Type
    {
        $symbols = new TokensExtractor($raw);

        $tokens = array_map(
            fn (string $symbol) => $this->lexer->tokenize($symbol),
            $symbols->all()
        );

        return (new TokenStream(...$tokens))->read();
    }
}
