<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Factory\Specifications;

use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Factory\TypeParserFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\Token\TraversingToken;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\TypeParser;

/** @internal */
interface TypeParserSpecification
{
    public function manipulateToken(TraversingToken $token): TraversingToken;

    public function manipulateParser(TypeParser $parser, TypeParserFactory $typeParserFactory): TypeParser;
}
