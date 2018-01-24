/**
 * LS-8 v2.0 emulator skeleton code
 */

const fs = require('fs');

// Instructions

const HLT  = 0b00011011; // Halt CPU
const LDI  = 0b00000100; // Load Register Immediate
const MUL  = 0b00000101; // Multiply Register Register
const PRN  = 0b00000110; // Multiply Register Register
const PUSH = 0b00001010; // Push Register
const POP  = 0b00001011; // Pop Register
const CALL = 0b00001111; // Call Register
const RET  = 0b00010000; // RET
const ADD  = 0b00001100; // ADD Register to Register

/**
 * Class for simulating a simple Computer (CPU & memory)
 */
class CPU {

    /**
     * Initialize the CPU
     */
    constructor(ram) {
        this.ram = ram;

        this.reg = new Array(8).fill(0); // General-purpose registers R0-R7

        this.reg[7] = 0xf8;
        
        // Special-purpose registers
        this.reg.PC = 0; // Program Counter
        this.reg.IR = 0; // Instruction Register

        this.setupBranchTable();
    }
    
    /**
     * Sets up the branch table
     */
    setupBranchTable() {
        let bt = {};

        bt[HLT] = this.HLT;
        bt[MUL] = this.MUL;
        bt[LDI] = this.LDI;
        bt[PRN] = this.PRN;
        bt[PUSH] = this.PUSH;
        bt[POP] = this.POP;
        bt[CALL] = this.CALL;
        bt[RET] = this.RET;
        bt[ADD] = this.ADD;

        this.branchTable = bt;
    }

    /**
     * Store value in memory address, useful for program loading
     */
    poke(address, value) {
        this.ram.write(address, value);
    }

    /**
     * Starts the clock ticking on the CPU
     */
    startClock() {
        /*
        console.log("RAM dump");
        for (let i = 0; i < 15; i++) {
            console.log(this.ram.read(i).toString(2));
        }
        */

        const _this = this;

        this.clock = setInterval(() => {
            _this.tick();
        }, 1);
    }

    /**
     * Stops the clock
     */
    stopClock() {
        clearInterval(this.clock);
    }

    /**
     * ALU functionality
     * 
     * op can be: ADD SUB MUL DIV INC DEC CMP
     */
    alu(op, regA, regB) {
        let valA = this.reg[regA];
        let valB = this.reg[regB];

        switch (op) {
            case 'MUL':
                this.reg[regA] = (valA * valB) & 255;
                break;

            case 'ADD':
                this.reg[regA] = (valA + valB) & 255;
                break;
        }
    }

    /**
     * Advances the CPU one cycle
     */
    tick() {
        // Load the instruction register from the memory address pointed to by
        // the PC
        this.reg.IR = this.ram.read(this.reg.PC);

        // Debugging output
        //console.log(`${this.reg.PC}: ${this.reg.IR.toString(2)}`);

        // Based on the value in the Instruction Register, jump to the
        // appropriate hander in the branchTable
        const handler = this.branchTable[this.reg.IR];

        // Check that the handler is defined, halt if not (invalid
        // instruction)
        if (!handler) {
            console.error(`Invalid instruction at address ${this.reg.PC}: ${this.reg.IR.toString(2)}`);
            this.stopClock();
            return;
        }

        // We need to use call() so we can set the "this" value inside
        // the handler (otherwise it will be undefined in the handler)
        handler.call(this);
    }

    // INSTRUCTION HANDLER CODE:

    /**
     * HLT
     */
    HLT() {
        this.stopClock();
    }

    /**
     * LDI R,I
     */
    LDI() {
        const regA = this.ram.read(this.reg.PC + 1);
        const val  = this.ram.read(this.reg.PC + 2); // immediate value

        this.reg[regA] = val;

        // Move the PC
        this.reg.PC += 3;
    }

    /**
     * MUL R,R
     */
    MUL() {
        const regA = this.ram.read(this.reg.PC + 1);
        const regB = this.ram.read(this.reg.PC + 2);

        this.alu('MUL', regA, regB);

        // Move the PC
        this.reg.PC += 3;
    }

    /**
     * PRN R
     */
    PRN() {
        const regA = this.ram.read(this.reg.PC + 1);

        console.log(this.reg[regA]);

        this.reg.PC += 2;
    }

    /**
     * PUSH R
     */
    PUSH() {
        const regA = this.ram.read(this.reg.PC + 1);

        this.reg[7]--; // dec R7 (SP)
        this.ram.write(this.reg[7], this.reg[regA]);

        this.reg.PC += 2;
    }

    /**
     * POP R
     */
    POP() {
        const regA = this.ram.read(this.reg.PC + 1);
        const stackVal = this.ram.read(this.reg[7]);

        this.reg[regA] = stackVal;

        this.reg[7]++;

        this.reg.PC += 2;
    }

    /**
     * CALL R
     */
    CALL() {
        const regA = this.ram.read(this.reg.PC + 1);

        // Push address of next instruction on stack
        this.reg[7]--; // dec R7 (SP)
        this.ram.write(this.reg[7], this.reg.PC + 2);

        // Jump to the address stored in regA
        this.reg.PC = this.reg[regA];
    }
    
    /**
     * RET R
     */
    RET() {
        this.reg.PC = this.ram.read(this.reg[7]);
        this.reg[7]++;
    }

    /**
     * JMP R
     */
    JMP() {
        const regA = this.ram.read(this.reg.PC + 1);

        // Jump to the address stored in regA
        this.reg.PC = this.reg[regA];
    }

    /**
     * MUL R,R
     */
    ADD() {
        const regA = this.ram.read(this.reg.PC + 1);
        const regB = this.ram.read(this.reg.PC + 2);

        this.alu('ADD', regA, regB);

        // Move the PC
        this.reg.PC += 3;
    }
}

module.exports = CPU;
