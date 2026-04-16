<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Factory;

use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Factory\Specifications\TypeParserSpecification;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\TypeParser;

/** @internal */
interface TypeParserFactory
{
    public function get(TypeParserSpecification ...$specifications): TypeParser;
}
