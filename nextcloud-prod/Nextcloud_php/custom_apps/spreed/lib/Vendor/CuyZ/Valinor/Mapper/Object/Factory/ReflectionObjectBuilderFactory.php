<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory;

use OCA\Talk\Vendor\CuyZ\Valinor\Definition\ClassDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\ReflectionObjectBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Utility\Reflection\Reflection;

/** @internal */
final class ReflectionObjectBuilderFactory implements ObjectBuilderFactory
{
    public function for(ClassDefinition $class): array
    {
        if (Reflection::enumExists($class->name)) {
            return [];
        }

        return [new ReflectionObjectBuilder($class)];
    }
}
