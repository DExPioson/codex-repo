<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Reflection;

use OCA\Talk\Vendor\CuyZ\Valinor\Definition\AttributeDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Attributes;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\ParameterDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\AttributesRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\UnresolvableType;
use OCA\Talk\Vendor\CuyZ\Valinor\Utility\Reflection\Reflection;
use ReflectionAttribute;
use ReflectionParameter;

use function array_map;

/** @internal */
final class ReflectionParameterDefinitionBuilder
{
    public function __construct(private AttributesRepository $attributesRepository) {}

    public function for(ReflectionParameter $reflection, ReflectionTypeResolver $typeResolver): ParameterDefinition
    {
        /** @var non-empty-string $name */
        $name = $reflection->name;
        $signature = Reflection::signature($reflection);
        $type = $typeResolver->resolveType($reflection);
        $nativeType = $typeResolver->resolveNativeType($reflection);
        $isOptional = $reflection->isOptional();
        $isVariadic = $reflection->isVariadic();

        if ($reflection->isDefaultValueAvailable()) {
            $defaultValue = $reflection->getDefaultValue();
        } elseif ($reflection->isVariadic()) {
            $defaultValue = [];
        } else {
            $defaultValue = null;
        }

        if ($isOptional
            && ! $type instanceof UnresolvableType
            && ! $type->accepts($defaultValue)
        ) {
            $type = UnresolvableType::forInvalidParameterDefaultValue($signature, $type, $defaultValue);
        }

        return new ParameterDefinition(
            $name,
            $signature,
            $type,
            $nativeType,
            $isOptional,
            $isVariadic,
            $defaultValue,
            new Attributes(...$this->attributes($reflection)),
        );
    }

    /**
     * @return list<AttributeDefinition>
     */
    private function attributes(ReflectionParameter $reflection): array
    {
        return array_map(
            fn (ReflectionAttribute $attribute) => $this->attributesRepository->for($attribute),
            Reflection::attributes($reflection)
        );
    }
}
