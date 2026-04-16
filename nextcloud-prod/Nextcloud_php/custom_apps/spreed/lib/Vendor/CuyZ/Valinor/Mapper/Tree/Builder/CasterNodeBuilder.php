<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder;

use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Exception\NoCasterForType;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Shell;

/** @internal */
final class CasterNodeBuilder implements NodeBuilder
{
    public function __construct(
        /** @var array<class-string, NodeBuilder> */
        private array $builders
    ) {}

    public function build(Shell $shell, RootNodeBuilder $rootBuilder): TreeNode
    {
        $type = $shell->type();

        foreach ($this->builders as $allowed => $builder) {
            if ($type instanceof $allowed) {
                return $builder->build($shell, $rootBuilder);
            }
        }

        throw new NoCasterForType($type);
    }
}
