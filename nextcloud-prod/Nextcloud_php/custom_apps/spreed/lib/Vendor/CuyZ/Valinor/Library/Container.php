<?php

declare(strict_types=1);

namespace OCA\Talk\Vendor\CuyZ\Valinor\Library;

use OCA\Talk\Vendor\CuyZ\Valinor\Cache\ChainCache;
use OCA\Talk\Vendor\CuyZ\Valinor\Cache\KeySanitizerCache;
use OCA\Talk\Vendor\CuyZ\Valinor\Cache\RuntimeCache;
use OCA\Talk\Vendor\CuyZ\Valinor\Cache\Warmup\RecursiveCacheWarmupService;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\FunctionsContainer;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Cache\CacheClassDefinitionRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Cache\CacheFunctionDefinitionRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\ClassDefinitionRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\FunctionDefinitionRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Reflection\ReflectionAttributesRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Reflection\ReflectionClassDefinitionRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Definition\Repository\Reflection\ReflectionFunctionDefinitionRepository;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\ArgumentsMapper;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory\CacheObjectBuilderFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory\CollisionObjectBuilderFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory\ConstructorObjectBuilderFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory\DateTimeObjectBuilderFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory\DateTimeZoneObjectBuilderFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory\ObjectBuilderFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory\ReflectionObjectBuilderFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\Factory\StrictTypesObjectBuilderFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Object\ObjectBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\ArrayNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\CasterNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\CasterProxyNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\ErrorCatcherNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\InterfaceNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\IterableNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\ListNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\ObjectNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\NodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\NullNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\ObjectImplementations;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\FilteredObjectNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\RootNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\ScalarNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\ShapedArrayNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\StrictNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\UnionNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\Tree\Builder\ValueAlteringNodeBuilder;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\TreeMapper;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\TypeArgumentsMapper;
use OCA\Talk\Vendor\CuyZ\Valinor\Mapper\TypeTreeMapper;
use OCA\Talk\Vendor\CuyZ\Valinor\Normalizer\ArrayNormalizer;
use OCA\Talk\Vendor\CuyZ\Valinor\Normalizer\Format;
use OCA\Talk\Vendor\CuyZ\Valinor\Normalizer\JsonNormalizer;
use OCA\Talk\Vendor\CuyZ\Valinor\Normalizer\Normalizer;
use OCA\Talk\Vendor\CuyZ\Valinor\Normalizer\Transformer\KeyTransformersHandler;
use OCA\Talk\Vendor\CuyZ\Valinor\Normalizer\Transformer\RecursiveTransformer;
use OCA\Talk\Vendor\CuyZ\Valinor\Normalizer\Transformer\ValueTransformersHandler;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\ObjectType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Factory\LexingTypeParserFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\Factory\TypeParserFactory;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Parser\TypeParser;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\ScalarType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\ArrayType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\IterableType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\ListType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NonEmptyArrayType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NonEmptyListType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\NullType;
use OCA\Talk\Vendor\CuyZ\Valinor\Type\Types\ShapedArrayType;
use OCA\Talk\Vendor\Psr\SimpleCache\CacheInterface;

use function array_keys;
use function call_user_func;
use function count;

/** @internal */
final class Container
{
    /** @var array<class-string, object> */
    private array $services = [];

    /** @var array<class-string, callable(): object> */
    private array $factories;

    public function __construct(Settings $settings)
    {
        $this->factories = [
            TreeMapper::class => fn () => new TypeTreeMapper(
                $this->get(TypeParser::class),
                $this->get(RootNodeBuilder::class)
            ),

            ArgumentsMapper::class => fn () => new TypeArgumentsMapper(
                $this->get(FunctionDefinitionRepository::class),
                $this->get(RootNodeBuilder::class)
            ),

            RootNodeBuilder::class => fn () => new RootNodeBuilder(
                $this->get(NodeBuilder::class)
            ),

            NodeBuilder::class => function () use ($settings) {
                $listNodeBuilder = new ListNodeBuilder($settings->enableFlexibleCasting);
                $arrayNodeBuilder = new ArrayNodeBuilder($settings->enableFlexibleCasting);

                $builder = new CasterNodeBuilder([
                    ListType::class => $listNodeBuilder,
                    NonEmptyListType::class => $listNodeBuilder,
                    ArrayType::class => $arrayNodeBuilder,
                    NonEmptyArrayType::class => $arrayNodeBuilder,
                    IterableType::class => $arrayNodeBuilder,
                    ShapedArrayType::class => new ShapedArrayNodeBuilder($settings->allowSuperfluousKeys),
                    ScalarType::class => new ScalarNodeBuilder($settings->enableFlexibleCasting),
                    NullType::class => new NullNodeBuilder(),
                    ObjectType::class => new ObjectNodeBuilder(
                        $this->get(ClassDefinitionRepository::class),
                        $this->get(ObjectBuilderFactory::class),
                        $this->get(FilteredObjectNodeBuilder::class),
                        $settings->enableFlexibleCasting,
                    ),
                ]);

                $builder = new UnionNodeBuilder($builder);

                $builder = new InterfaceNodeBuilder(
                    $builder,
                    $this->get(ObjectImplementations::class),
                    $this->get(ClassDefinitionRepository::class),
                    $this->get(ObjectBuilderFactory::class),
                    $this->get(FilteredObjectNodeBuilder::class),
                    new FunctionsContainer(
                        $this->get(FunctionDefinitionRepository::class),
                        $settings->customConstructors
                    ),
                    $settings->enableFlexibleCasting,
                    $settings->allowSuperfluousKeys,
                );

                $builder = new CasterProxyNodeBuilder($builder);
                $builder = new IterableNodeBuilder($builder);

                if (count($settings->valueModifier) > 0) {
                    $builder = new ValueAlteringNodeBuilder(
                        $builder,
                        new FunctionsContainer(
                            $this->get(FunctionDefinitionRepository::class),
                            $settings->valueModifier
                        )
                    );
                }

                $builder = new StrictNodeBuilder($builder, $settings->allowPermissiveTypes, $settings->enableFlexibleCasting);

                return new ErrorCatcherNodeBuilder($builder, $settings->exceptionFilter);
            },

            FilteredObjectNodeBuilder::class => fn () => new FilteredObjectNodeBuilder($settings->allowSuperfluousKeys),

            ObjectImplementations::class => fn () => new ObjectImplementations(
                new FunctionsContainer(
                    $this->get(FunctionDefinitionRepository::class),
                    $settings->inferredMapping
                ),
                $this->get(TypeParser::class),
            ),

            ObjectBuilderFactory::class => function () use ($settings) {
                $constructors = new FunctionsContainer(
                    $this->get(FunctionDefinitionRepository::class),
                    $settings->customConstructors
                );

                $factory = new ReflectionObjectBuilderFactory();
                $factory = new ConstructorObjectBuilderFactory($factory, $settings->nativeConstructors, $constructors);
                $factory = new DateTimeZoneObjectBuilderFactory($factory, $this->get(FunctionDefinitionRepository::class));
                $factory = new DateTimeObjectBuilderFactory($factory, $settings->supportedDateFormats, $this->get(FunctionDefinitionRepository::class));
                $factory = new CollisionObjectBuilderFactory($factory);

                if (! $settings->allowPermissiveTypes) {
                    $factory = new StrictTypesObjectBuilderFactory($factory);
                }

                /** @var RuntimeCache<list<ObjectBuilder>> $cache */
                $cache = new RuntimeCache();

                return new CacheObjectBuilderFactory($factory, $cache);
            },

            RecursiveTransformer::class => fn () => new RecursiveTransformer(
                $this->get(ClassDefinitionRepository::class),
                new ValueTransformersHandler(
                    $this->get(FunctionDefinitionRepository::class),
                ),
                new KeyTransformersHandler(),
                $settings->transformersSortedByPriority(),
                array_keys($settings->transformerAttributes),
            ),

            ArrayNormalizer::class => fn () => new ArrayNormalizer(
                $this->get(RecursiveTransformer::class),
            ),

            JsonNormalizer::class => fn () => new JsonNormalizer(
                $this->get(RecursiveTransformer::class),
            ),

            ClassDefinitionRepository::class => fn () => new CacheClassDefinitionRepository(
                new ReflectionClassDefinitionRepository(
                    $this->get(TypeParserFactory::class),
                ),
                $this->get(CacheInterface::class),
            ),

            FunctionDefinitionRepository::class => fn () => new CacheFunctionDefinitionRepository(
                new ReflectionFunctionDefinitionRepository(
                    $this->get(TypeParserFactory::class),
                    new ReflectionAttributesRepository(
                        $this->get(ClassDefinitionRepository::class),
                    ),
                ),
                $this->get(CacheInterface::class)
            ),

            TypeParserFactory::class => fn () => new LexingTypeParserFactory(),

            TypeParser::class => fn () => $this->get(TypeParserFactory::class)->get(),

            RecursiveCacheWarmupService::class => fn () => new RecursiveCacheWarmupService(
                $this->get(TypeParser::class),
                $this->get(CacheInterface::class),
                $this->get(ObjectImplementations::class),
                $this->get(ClassDefinitionRepository::class),
                $this->get(ObjectBuilderFactory::class)
            ),

            CacheInterface::class => function () use ($settings) {
                $cache = new RuntimeCache();

                if (isset($settings->cache)) {
                    $cache = new ChainCache($cache, new KeySanitizerCache($settings->cache));
                }

                return $cache;
            },
        ];
    }

    public function treeMapper(): TreeMapper
    {
        return $this->get(TreeMapper::class);
    }

    public function argumentsMapper(): ArgumentsMapper
    {
        return $this->get(ArgumentsMapper::class);
    }

    /**
     * @template T of Normalizer
     *
     * @param Format<T> $format
     * @return T
     */
    public function normalizer(Format $format): Normalizer
    {
        return $this->get($format->type());
    }

    public function cacheWarmupService(): RecursiveCacheWarmupService
    {
        return $this->get(RecursiveCacheWarmupService::class);
    }

    /**
     * @template T of object
     * @param class-string<T> $name
     * @return T
     */
    private function get(string $name): object
    {
        return $this->services[$name] ??= call_user_func($this->factories[$name]); // @phpstan-ignore-line
    }
}
