<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder;

use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Exception\InvalidListKey;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Exception\SourceMustBeIterable;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Shell;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\CompositeTraversableType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\ListType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NonEmptyListType;

use function assert;
use function is_array;

/** @internal */
final class ListNodeBuilder implements NodeBuilder
{
    public function __construct(private bool $enableFlexibleCasting) {}

    public function build(Shell $shell, RootNodeBuilder $rootBuilder): TreeNode
    {
        $type = $shell->type();
        $value = $shell->value();

        assert($type instanceof ListType || $type instanceof NonEmptyListType);

        if ($this->enableFlexibleCasting && $value === null) {
            return TreeNode::branch($shell, [], []);
        }

        if (! is_array($value)) {
            throw new SourceMustBeIterable($value, $type);
        }

        $children = $this->children($type, $shell, $rootBuilder);
        $array = $this->buildArray($children);

        return TreeNode::branch($shell, $array, $children);
    }

    /**
     * @return array<TreeNode>
     */
    private function children(CompositeTraversableType $type, Shell $shell, RootNodeBuilder $rootBuilder): array
    {
        /** @var array<mixed> $values */
        $values = $shell->value();
        $subType = $type->subType();

        $expected = 0;
        $children = [];

        foreach ($values as $key => $value) {
            if ($this->enableFlexibleCasting || $key === $expected) {
                $child = $shell->child((string)$expected, $subType);
                $children[$expected] = $rootBuilder->build($child->withValue($value));
            } else {
                $child = $shell->child((string)$key, $subType);
                $children[$key] = TreeNode::error($child, new InvalidListKey($key, $expected));
            }

            $expected++;
        }

        return $children;
    }

    /**
     * @param array<TreeNode> $children
     * @return mixed[]|null
     */
    private function buildArray(array $children): ?array
    {
        $array = [];

        foreach ($children as $key => $child) {
            if (! $child->isValid()) {
                return null;
            }

            $array[$key] = $child->value();
        }

        return $array;
    }
}
