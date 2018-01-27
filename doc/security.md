# Security

In cotonic all independent components need to communicat with each other,
because there is no way of knowing where a message originates from

## UBF(A)

In https://github.com/zotonic/zotonic we use UBF(A) messages to communicate
between the javascript world and the erlang world. UBF(A) is a great binary format,
and easily parsable. This made it an ideal candidate to use as an over the wire 
language between javascript and zotonic.

For more information on UBF(A) see: http://armstrongonsoftware.blogspot.nl/2008/07/ubf-and-vm-opcocde-design.html
and the original specification: http://www.erlang.se/workshop/2002/Armstrong.pdf

We would like to continue to use UBF because it allows:

  * Very easy parsing of complex data types
  * Efficient over the wire encoding.
  * The possibility to define a protocol with typed messages and adding external type/contract checkers.

## UBF(A) and Cryptography

In order to use UBF(A) for a cryptographic purposes it is needed to specify a rigourous encoding. Adding whitespace
to UBF(A) encoded messages does not change the meaning of the message, but one extra spaces would completely
alter any cryptographic hash.

In order to survive addtion of semantically meaningless characters like whitespace and comments we need to
define a  canonical form of UBF(A). This would basically be UBF without unneeded whitespace and comments.

## Or use CBOR en COSE?

TODO