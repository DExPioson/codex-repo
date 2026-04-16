<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory;

use OCA\Talk\Vendor\CuyZ\Valinor\Definition\ClassDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\ObjectBuilder;

/** @internal */
interface ObjectBuilderFactory
{
    /**
     * @return list<ObjectBuilder>
     */
    public function for(ClassDefinition $class): array;
}
