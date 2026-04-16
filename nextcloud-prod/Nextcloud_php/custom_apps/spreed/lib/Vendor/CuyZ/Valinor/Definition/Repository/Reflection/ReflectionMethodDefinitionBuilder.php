<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Reflection;

use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Attributes;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\MethodDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Parameters;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\AttributesRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Utility\Reflection\Reflection;
use ReflectionAttribute;
use ReflectionMethod;
use ReflectionParameter;

use function array_map;

/** @internal */
final class ReflectionMethodDefinitionBuilder
{
    private AttributesRepository $attributesRepository;

    private ReflectionParameterDefinitionBuilder $parameterBuilder;

    public function __construct(AttributesRepository $attributesRepository)
    {
        $this->attributesRepository = $attributesRepository;
        $this->parameterBuilder = new ReflectionParameterDefinitionBuilder($attributesRepository);
    }

    public function for(ReflectionMethod $reflection, ReflectionTypeResolver $typeResolver): MethodDefinition
    {
        /** @var non-empty-string $name */
        $name = $reflection->name;

        $attributes = array_map(
            fn (ReflectionAttribute $attribute) => $this->attributesRepository->for($attribute),
            Reflection::attributes($reflection)
        );

        $parameters = array_map(
            fn (ReflectionParameter $parameter) => $this->parameterBuilder->for($parameter, $typeResolver),
            $reflection->getParameters()
        );

        $returnType = $typeResolver->resolveType($reflection);

        return new MethodDefinition(
            $name,
            Reflection::signature($reflection),
            new Attributes(...$attributes),
            new Parameters(...$parameters),
            $reflection->isStatic(),
            $reflection->isPublic(),
            $returnType
        );
    }
}
