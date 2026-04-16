<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository;

use OCA\Talk\Vendor\CuyZ\Valinor\Definition\AttributeDefinition;
use ReflectionAttribute;

/** @internal */
interface AttributesRepository
{
    /**
     * @param ReflectionAttribute<object> $reflection
     */
    public function for(ReflectionAttribute $reflection): AttributeDefinition;
}
