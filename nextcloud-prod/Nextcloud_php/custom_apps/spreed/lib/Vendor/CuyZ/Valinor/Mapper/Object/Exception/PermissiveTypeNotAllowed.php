<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Exception;

use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Argument;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\ObjectBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Utility\PermissiveTypeFound;
use LogicException;

/** @internal */
final class PermissiveTypeNotAllowed extends LogicException
{
    public function __construct(ObjectBuilder $builder, Argument $argument, PermissiveTypeFound $original)
    {
        parent::__construct(
            "Error for `{$argument->name()}` in `{$builder->signature()}`: {$original->getMessage()}",
            1655389255,
            $original
        );
    }
}
