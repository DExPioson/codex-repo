<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object;

/** @internal */
interface ObjectBuilder
{
    public function describeArguments(): Arguments;

    /**
     * @param array<string, mixed> $arguments
     */
    public function build(array $arguments): object;

    public function signature(): string;
}
