<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Reflection;

use OCA\Talk\Vendor\CuyZ\Valinor\Definition\AttributeDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Attributes;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\PropertyDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\AttributesRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Type;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NullType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\UnresolvableType;
use OCA\Talk\Vendor\CuyZ\Valinor\Utility\Reflection\Reflection;
use ReflectionAttribute;
use ReflectionProperty;

use function array_map;

/** @internal */
final class ReflectionPropertyDefinitionBuilder
{
    public function __construct(private AttributesRepository $attributesRepository) {}

    public function for(ReflectionProperty $reflection, ReflectionTypeResolver $typeResolver): PropertyDefinition
    {
        /** @var non-empty-string $name */
        $name = $reflection->name;
        $signature = Reflection::signature($reflection);
        $type = $typeResolver->resolveType($reflection);
        $nativeType = $typeResolver->resolveNativeType($reflection);
        $hasDefaultValue = $this->hasDefaultValue($reflection, $type);
        $defaultValue = $reflection->getDefaultValue();
        $isPublic = $reflection->isPublic();

        if ($hasDefaultValue
            && ! $type instanceof UnresolvableType
            && ! $type->accepts($defaultValue)
        ) {
            $type = UnresolvableType::forInvalidPropertyDefaultValue($signature, $type, $defaultValue);
        }

        return new PropertyDefinition(
            $name,
            $signature,
            $type,
            $nativeType,
            $hasDefaultValue,
            $defaultValue,
            $isPublic,
            new Attributes(...$this->attributes($reflection)),
        );
    }

    private function hasDefaultValue(ReflectionProperty $reflection, Type $type): bool
    {
        if ($reflection->hasType()) {
            return $reflection->hasDefaultValue();
        }

        return $reflection->getDeclaringClass()->getDefaultProperties()[$reflection->name] !== null
            || NullType::get()->matches($type);
    }

    /**
     * @return list<AttributeDefinition>
     */
    private function attributes(ReflectionProperty $reflection): array
    {
        return array_map(
            fn (ReflectionAttribute $attribute) => $this->attributesRepository->for($attribute),
            Reflection::attributes($reflection)
        );
    }
}
