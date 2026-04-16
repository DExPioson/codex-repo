<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object;

use Countable;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\ParameterDefinition;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Parameters;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Properties;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\PropertyDefinition;
use IteratorAggregate;
use Traversable;

use function array_map;
use function array_values;

/**
 * @internal
 *
 * @implements IteratorAggregate<Argument>
 */
final class Arguments implements IteratorAggregate, Countable
{
    /** @var Argument[] */
    private array $arguments;

    public function __construct(Argument ...$arguments)
    {
        $this->arguments = $arguments;
    }

    public static function fromParameters(Parameters $parameters): self
    {
        return new self(...array_map(
            fn (ParameterDefinition $parameter) => Argument::fromParameter($parameter),
            array_values([...$parameters])
        ));
    }

    public static function fromProperties(Properties $properties): self
    {
        return new self(...array_map(
            fn (PropertyDefinition $property) => Argument::fromProperty($property),
            array_values([...$properties])
        ));
    }

    public function at(int $index): Argument
    {
        return $this->arguments[$index];
    }

    public function has(string $name): bool
    {
        foreach ($this->arguments as $argument) {
            if ($argument->name() === $name) {
                return true;
            }
        }

        return false;
    }

    public function count(): int
    {
        return count($this->arguments);
    }

    /**
     * @return Traversable<Argument>
     */
    public function getIterator(): Traversable
    {
        yield from $this->arguments;
    }
}
