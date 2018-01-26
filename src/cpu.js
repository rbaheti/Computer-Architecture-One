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
const ADD  = 0b00001100; // Add R R
const JMP  = 0b00010001; // Jump R R
const ST   = 0b00001001; // Store R R
const LD   = 0b00010010; // Load R R
const IRET = 0b00011010; // Return from interrupt
const PRA  = 0b00000111; // Print alpha

const IM = 5; // R5
const IS = 6; // R6
const SP = 7; // R7

const I0Vector = 0xf8;

const timerInterrupt = 1;

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

        this.reg[SP] = I0Vector;
        
        // Special-purpose registers
        this.reg.PC = 0; // Program Counter
        this.reg.IR = 0; // Instruction Register

        this.flags = {
            interruptsEnabled: true,
        };

        this.fanSpeed = 2;

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
        bt[JMP] = this.JMP;
        bt[ST] = this.ST;
        bt[LD] = this.LD;
        bt[IRET] = this.IRET;
        bt[PRA] = this.PRA;

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

        this.timerHandle = setInterval(() => {
            // Trigger timer interrupt
            // set bit 0 of IS to 1
            this.raiseInterrupt(timerInterrupt);
        }, 1000);
    }

    /**
     * Stops the clock
     */
    stopClock() {
        clearInterval(this.clock);
        clearInterval(this.timerHandle);
    }

    /**
     * Raise an interrupt
     */
    raiseInterrupt(n) {
        this.reg[IS] |= n;
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
                let product = valA * valB;

                this.flags.overflow = product > 255;
                
                this.reg[regA] = product & 255;
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
        // Interrupt stuff

        // Check if an interrupt happened
        const maskedInterrupts = this.reg[IS] & this.reg[IM];

        if (this.flags.interruptsEnabled && maskedInterrupts !== 0) {
            for (let i = 0; i <= 7; i++) {
                if (((maskedInterrupts >> i) & 1) === 1) {
                    // Handling interrupt
                    this.flags.interruptsEnabled = false;

                    // Clear the ith bit in the IS
                    this.reg[IS] &= ~(1 << i);

                    // Push PC on stack
                    this.reg[SP]--; // dec R7 (SP)
                    this.ram.write(this.reg[SP], this.reg.PC);

                    // Push remaining registers on stack
                    for (let j = 0; j <= 7; j++) {
                        this.reg[SP]--; // dec R7 (SP)
                        this.ram.write(this.reg[SP], this.reg[j]);
                    }

                    // Look up the handler address in the interrupt vector table
                    const vectorTableEntry = 0xf8 + i;
                    const handlerAddress = this.ram.read(vectorTableEntry);

                    // Set PC to handler
                    this.reg.PC = handlerAddress;

                    //console.log('handling interrupt! ' + i);
                    break;
                }
            }
        }

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

        this.reg[SP]--; // dec R7 (SP)
        this.ram.write(this.reg[SP], this.reg[regA]);

        this.reg.PC += 2;
    }

    /**
     * POP R
     */
    POP() {
        const regA = this.ram.read(this.reg.PC + 1);
        const stackVal = this.ram.read(this.reg[SP]);

        this.reg[regA] = stackVal;

        this.reg[SP]++;

        this.reg.PC += 2;
    }

    /**
     * CALL R
     */
    CALL() {
        const regA = this.ram.read(this.reg.PC + 1);

        // Push address of next instruction on stack
        this.reg[SP]--; // dec R7 (SP)
        this.ram.write(this.reg[SP], this.reg.PC + 2);

        // Jump to the address stored in regA
        this.reg.PC = this.reg[regA];
    }

    /**
     * RET
     */
    RET() {
        this.reg.PC = this.ram.read(this.reg[SP]);
        this.reg[SP]++;
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
     * ADD R R
     */
    ADD() {
        const regA = this.ram.read(this.reg.PC + 1);
        const regB = this.ram.read(this.reg.PC + 2);

        this.alu('ADD', regA, regB);

        // Move the PC
        this.reg.PC += 3;
    }

    /**
     * ST R R
     */
    ST() {
        const regA = this.ram.read(this.reg.PC + 1);
        const regB = this.ram.read(this.reg.PC + 2);

        this.ram.write(this.reg[regA], this.reg[regB]);

        // Move the PC
        this.reg.PC += 3;
    }

    /**
     * IRET
     */
    IRET() {
        // Pop remaining registers off stack
        for (let j = 7; j >= 0; j--) {
            this.reg[j] = this.ram.read(this.reg[SP]);
            this.reg[SP]++; // inc R7 (SP)
        }

        // Pop PC off stack
        this.reg.PC = this.ram.read(this.reg[SP]);
        this.reg[SP]++; // inc R7 (SP)

        // Enable interrupts
        this.flags.interruptsEnabled = true;
    }

    /**
     * PRA
     */
    PRA() {
        const regA = this.ram.read(this.reg.PC + 1);

        process.stdout.write(String.fromCharCode(this.reg[regA]));

        this.reg.PC += 2;
    }

    /**
     * LD R R
     */
    LD() {
        const regA = this.ram.read(this.reg.PC + 1);
        const regB = this.ram.read(this.reg.PC + 2);

        this.reg[regA] = this.ram.read(this.reg[regB]);

        this.reg.PC += 3;
    }
}

module.exports = CPU;
