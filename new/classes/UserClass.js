const User = require('../storage/userSchema');
const { Client } = require('../bot');
const { Time } = require('../modules/Time');
const client = Client.get();

const cooldowns = {
    work: 20000,
    mine: 120000,
    crime: 60000,
    rob: 60000,
    robUser: 300000,
    race: 150000,
    apply: 600000,
    pay: 3600000, 
    flip: 15000,
    hunt: 90000,
    paint: 115000
};

module.exports = class {
    constructor(user, model) {
        this.id = user.id;

        this.user = user;
        
        this.model = model;
    }

    // ==================================================================================
    // COIN MANAGEMENT
    // ==================================================================================

    addCoins(amount = 0) {
        if (isNaN(amount)) amount = 0;
        this.model.profiles.economy.balance += amount;
        if (this.model.profiles.economy.balance < 0) this.model.profiles.economy.balance = 0;
        client.logger.econ(`Added ${amount} coins to ${this.id}, new balance: $${this.model.profiles.economy.balance}`);
        return;
    }

    delCoins(amount = 0) {
        if (isNaN(amount)) amount = 0;
        this.model.profiles.economy.balance -= amount;
        if (this.model.profiles.economy.balance < 0) this.model.profiles.economy.balance = 0;
        client.logger.econ(`Removed ${amount} coins from ${this.id}, new balance: $${this.model.profiles.economy.balance}`);
        return;
    }

    setCoins(amount = 500) {
        if (isNaN(amount)) amount = 0;
        this.model.profiles.economy.balance = amount;
        if (this.model.profiles.economy.balance < 0) this.model.profiles.economy.balance = 0;
        client.logger.econ(`Set ${this.id}'s balance to ${amount} coins`);
        return;
    }

    getCoins() {
        return this.model.profiles.economy.balance;
    }

    // ==================================================================================
    // GEMS MANAGEMENT
    // ==================================================================================

    addGems(amount = 0) {
        if (isNaN(amount)) amount = 0;
        this.model.profiles.economy.gems += amount;
        if (this.model.profiles.economy.gems < 0) this.model.profiles.economy.gems = 0;
        client.logger.econ(`Added ${amount} gems to ${this.id}, new balance: $${this.model.profiles.economy.gems}`);
        return;
    }

    delGems(amount = 0) {
        if (isNaN(amount)) amount = 0;
        this.model.profiles.economy.gems -= amount;
        if (this.model.profiles.economy.gems < 0) this.model.profiles.economy.gems = 0;
        client.logger.econ(`Removed ${amount} gems from ${this.id}, new balance: $${this.model.profiles.economy.gems}`);
        return;
    }

    setGems(amount = 0) {
        if (isNaN(amount)) amount = 0;
        this.model.profiles.economy.gems = amount;
        if (this.model.profiles.economy.gems < 0) this.model.profiles.economy.gems = 0;
        client.logger.econ(`Set ${this.id}'s balance to ${amount} gems`);
        return;
    }

    getGems() {
        return this.model.profiles.economy.gems;
    }

    // ==================================================================================
    // WORK MANAGEMENT
    // ==================================================================================

    setJob(job = "begger") {
        this.model.profiles.stats.work.job = job;
        client.logger.job(`Set ${this.id}'s job to ${job}`);
        return true;
    }

    getJob() {
        return this.model.profiles.stats.work.job;
    }

    getPay(perfect = false, add = true) {
        const JOB_PAY = client.jobs.get(this.getJob()).pay;
        const RAISE_BONUS = this.getRaise().newRaise / 100;
        
        var FINAL_BONUS = RAISE_BONUS;
        if (perfect == true) FINAL_BONUS += 0.5

        const PAYOUT = Math.floor(JOB_PAY * 1 + FINAL_BONUS);
        if (add) this.addCoins(PAYOUT);
        return PAYOUT;
    }

    setSick(bool = false) {
        this.model.profiles.stats.work.sick = bool;
        client.logger.sick(`Set ${this.id}'s sickness to ${bool}`);
        return bool;
    }

    getSick() {
        return this.model.profiles.stats.work.sick;
    }

    getRaise() {
        if (this.model.profiles.stats.work.raise.count >= 25) {
            this.model.profiles.stats.work.raise.coint = 0;
            this.model.profiles.stats.work.raise.level += 1;
            client.logger.job(`${this.id} got a raise to level ${this.model.work.raiseLevel}`);
            return {
                levelUp: true,
                newRaise: this.model.profiles.stats.work.raise.level
            };
        }
        return {
            levelUp: false,
            newRaise: this.model.profiles.stats.work.raise.level
        };
    }

    setRaise(level = 0) {
        this.model.profiles.stats.work.raise.coint = 0;
        this.model.profiles.stats.work.raise.level = level;
        return this.model.profiles.stats.work.raise.level
    }

    addWork() {
        this.model.profiles.stats.work.raise.count += 1;
        this.model.profiles.stats.work.workCount += 1;
    }

    getWorkCount() {
        return this.model.profiles.stats.work.workCount;
    }

    // ==================================================================================
    // COOLDOWN MANAGEMENT
    // ==================================================================================

    getCooldown(type, set = true, msg) {
        const previousTime = this.model.profiles.stats.cooldowns[type]; // When command was last used
        const nowTime = new Date(); //
        const timePassed = Math.abs(previousTime - nowTime);

        var cooldown = cooldowns[type];

        if (type == "work" && this.getSick()) cooldown = 600000;

        if (timePassed + 300 < cooldown) {
            const timeLeftMs = Math.ceil(cooldown - timePassed);
            const timeLeftSec = (timeLeftMs / 1000);
            const timeLeftFormatted = Time.format(timeLeftMs);

            if (msg) msg.channel.send(this.generateCooldownEmbed(this.user, type, timeLeftFormatted)); 

            return {
                response: true,
                timeLeftSec: timeLeftSec,
                timeLeftMs: timeLeftMs,
                timeLeftFormatted: timeLeftFormatted,
                message: `${type} is on cooldown! ${timeLeftFormatted} remaining until you can perform ${type}`,
                embed: this.generateCooldownEmbed(this.user, type, timeLeftFormatted)
            }
        }

        if (this.getSick()) this.setSick(false);
        if (set) this.setCooldown(type);
        return {
            response: false
        };
    }

    setCooldown(type) {
        this.model.profiles.stats.cooldowns[type] = new Date();
        return true;
    }

    generateCooldownEmbed(user, type, remaining) {
        var formattedType = type.charAt(0).toUpperCase() + type.slice(1);

        const embed = {
            embed: {
                title: `Slow down ${user.username} ⏱`,
                description: `${formattedType} is on cooldown! Please wait ${remaining}.`,
                color: 16758528
            }
        }
        return embed;
    }
    
    // ==================================================================================
    // SAVE DATABASE
    // ==================================================================================

    save() {
        this.model.save();
        return true;
    }
}