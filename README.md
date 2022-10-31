# Entangler

This an alternative program to Metaplex's [Token Entangler](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/token-entangler) which is more automated but less flexible.

Metaplex Entangler requires the entangled collection to be minted before hand and each entangled pair to be created as well. This is flexible because it lets you create entanglement between any tokens.
However, the downsides are that you need to pay the rent for all those tokens and you need to run the entanglement initialization for each pair.

This Entangler instead rely's on Metaplex's Metadata v1.3 and the definition of token collection. You simply create an entangled collection where any token of the original collection can be entangled into the entangled collection, WHICH IS A COPY OF THE OG COLLECTION, only with different creators earning the royalties.

The main differences can be found in the table below:

| **Characteristics**             | **MPLX Entangler** | **Entangler** |
|---------------------------------|--------------------|---------------|
| Let users mint entangled tokens | NO                 | YES           |
| Possible fee on entanglement    | YES                | NO            |
| Mutable entangled tokens        | YES                | NO            |

