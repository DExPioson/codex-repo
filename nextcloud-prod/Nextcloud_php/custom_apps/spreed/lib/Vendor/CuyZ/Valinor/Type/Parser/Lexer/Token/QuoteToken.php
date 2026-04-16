<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\Token;

use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Exception\MissingClosingQuoteChar;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\TokenStream;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Type;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\StringValueType;

/** @internal */
final class QuoteToken implements TraversingToken
{
    public function __construct(private string $quoteType) {}

    public function traverse(TokenStream $stream): Type
    {
        $stringValue = '';

        while (! $stream->done()) {
            $next = $stream->forward();

            if ($next instanceof self && $next->quoteType === $this->quoteType) {
                return $this->quoteType === "'"
                    ? StringValueType::singleQuote($stringValue)
                    : StringValueType::doubleQuote($stringValue);
            }

            $stringValue .= $next->symbol();
        }

        throw new MissingClosingQuoteChar($stringValue);
    }

    public function symbol(): string
    {
        return $this->quoteType;
    }
}
