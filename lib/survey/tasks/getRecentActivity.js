var _ = require('lodash');
var async = require('async');
var json = require('../../util/json');
var logger = require('../../util/logger');

module.exports = getRecentActivity;

function getRecentActivity(organisation, next) {

    var q = async.queue(function(task, callback) {
        logger.info("Fetching %s commits", task.repo.full_name);

        organisation.provider.getCommits(task.organisation.name, task.repo.name, function(err, commits) {  
            if (err) return recordError(task.repo, err, callback);
            task.repo.activity = getActivity(commits);
            callback();
        });
    }, 5);

    q.drain = next;

    _.each(organisation.repositories, function(repo) {
        q.push({organisation: organisation, repo: repo})
    }) 

    function getActivity(commits) {
        return _.chain(commits).map(toActivity).unique(byAuthor).sort(byCommitDate).slice(0, 5).value();        
    }    

    function toActivity(entry) {
        return _.chain(entry.commit.author)
                .extend(entry.author)
                .extend({ date: new Date(entry.commit.author.date) })
                .extend({ message: entry.commit.message })
                .pick('name', 'email', 'date', 'login', 'id', 'message', 'avatar_url', 'html_url')
                .value();
    }

    function byAuthor(author) {
        return author.name;
    }

    function byCommitDate(author) {
        return author.date;
    }

    function recordError(repo, err, next) {
        logger.error('Error fetching commits for %s : %s', repo.name, err.message);
        repo.error = json.isJson(err.message) ? JSON.parse(err.message) : err;
        next();
    }    
}