<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder;

use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Exception\MissingNodeValue;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Shell;
use OCA\Talk\Vendor\CuyZ\Valinor\Utility\TypeHelper;

/** @internal */
final class StrictNodeBuilder implements NodeBuilder
{
    public function __construct(
        private NodeBuilder $delegate,
        private bool $allowPermissiveTypes,
        private bool $enableFlexibleCasting
    ) {}

    public function build(Shell $shell, RootNodeBuilder $rootBuilder): TreeNode
    {
        $type = $shell->type();

        if (! $this->allowPermissiveTypes) {
            TypeHelper::checkPermissiveType($type);
        }

        if (! $shell->hasValue()) {
            if ($this->enableFlexibleCasting) {
                return $this->delegate->build($shell->withValue(null), $rootBuilder);
            }

            throw new MissingNodeValue($type);
        }

        return $this->delegate->build($shell, $rootBuilder);
    }
}
