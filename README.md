#Intel 8080 assembly interpreter
This is a simple assembly interpreter for i8080 processor written in javascript


## Stages
* ### Writing stage
At this stage user can write any code and write any bits to memory and registry
* ### Assembly stage
At this stage program will go  over all of the text code and convert it into json structure that is much easier to operate upon, while writing operation bytes into memory. Any bytes written by hand by user that occupy space where assembler will write to will be overridden
* ### Run stage
Program will execute every command step by step. Manually writing to stack/memory/registry/counters is not allowed during execution 
