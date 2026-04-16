<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\Token;

use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Lexer\TokenStream;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Type;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\ArrayKeyType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\BooleanValueType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\MixedType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NativeBooleanType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NativeFloatType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NativeStringType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NegativeIntegerType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NonEmptyStringType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NonNegativeIntegerType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NonPositiveIntegerType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NullType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NumericStringType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\PositiveIntegerType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\UndefinedObjectType;

use function strtolower;

/** @internal */
final class NativeToken implements TraversingToken
{
    /** @var array<string, self> */
    private static array $map = [];

    private function __construct(
        private Type $type,
        private string $symbol
    ) {}

    public static function accepts(string $symbol): bool
    {
        return (bool)self::type(strtolower($symbol));
    }

    public static function from(string $symbol): self
    {
        $symbol = strtolower($symbol);
        $type = self::type($symbol);

        assert($type instanceof Type);

        return self::$map[$symbol] ??= new self($type, $symbol);
    }

    public function traverse(TokenStream $stream): Type
    {
        return $this->type;
    }

    public function symbol(): string
    {
        return $this->symbol;
    }

    private static function type(string $symbol): ?Type
    {
        return match ($symbol) {
            'null' => NullType::get(),
            'true' => BooleanValueType::true(),
            'false' => BooleanValueType::false(),
            'mixed' => MixedType::get(),
            'float' => NativeFloatType::get(),
            'positive-int' => PositiveIntegerType::get(),
            'negative-int' => NegativeIntegerType::get(),
            'non-positive-int' => NonPositiveIntegerType::get(),
            'non-negative-int' => NonNegativeIntegerType::get(),
            'string' => NativeStringType::get(),
            'non-empty-string' => NonEmptyStringType::get(),
            'numeric-string' => NumericStringType::get(),
            'bool', 'boolean' => NativeBooleanType::get(),
            'array-key' => ArrayKeyType::default(),
            'object' => UndefinedObjectType::get(),
            default => null,
        };
    }
}
