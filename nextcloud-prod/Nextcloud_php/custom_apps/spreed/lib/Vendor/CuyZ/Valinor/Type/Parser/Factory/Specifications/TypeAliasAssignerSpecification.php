<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Factory\Specifications;

use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Factory\TypeParserFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\Token\TraversingToken;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\Token\TypeToken;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\TypeParser;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Type;

/** @internal */
final class TypeAliasAssignerSpecification implements TypeParserSpecification
{
    public function __construct(
        /** @var array<string, Type> */
        private array $aliases,
    ) {}

    public function manipulateToken(TraversingToken $token): TraversingToken
    {
        $symbol = $token->symbol();

        if (isset($this->aliases[$symbol])) {
            return new TypeToken($this->aliases[$symbol], $symbol);
        }

        return $token;
    }

    public function manipulateParser(TypeParser $parser, TypeParserFactory $typeParserFactory): TypeParser
    {
        return $parser;
    }
}
