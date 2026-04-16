<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Reflection;

use OCA\Talk\Vendor\CuyZ\Valinor\Definition\AttributeDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\AttributesRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\ClassDefinitionRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NativeClassType;
use ReflectionAttribute;

/** @internal */
final class ReflectionAttributesRepository implements AttributesRepository
{
    public function __construct(private ClassDefinitionRepository $classDefinitionRepository) {}

    public function for(ReflectionAttribute $reflection): AttributeDefinition
    {
        $class = $this->classDefinitionRepository->for(new NativeClassType($reflection->getName()));

        return new AttributeDefinition(
            $class,
            $reflection->getArguments(),
        );
    }
}
