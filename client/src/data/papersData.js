import { getFirstDataCell, testSupabaseConnection, inspectQuetzalTable, listTables, updatePapersData } from "../supabase/supabaseController";
import toast from 'react-hot-toast';

export async function getInitialPapers() {
  try {
    const initialPapers = await getFirstDataCell();
    
    if (initialPapers && typeof initialPapers === 'string') {
      try {
        const parsed = JSON.parse(initialPapers);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        return [];
      }
    }
    
    if (Array.isArray(initialPapers)) {
      return initialPapers;
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

let papersData = [];

let listeners = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export const initializePapers = async () => {
  try {
    const connectionTest = await testSupabaseConnection();
    if (!connectionTest) {
      papersData = [];
      notifyListeners();
      return;
    }
    
    await listTables();
    const tableData = await inspectQuetzalTable();
    
    if (!tableData || tableData.length === 0) {
      papersData = [];
      notifyListeners();
      return;
    }
    
    papersData = await getInitialPapers();
    
    // Update old upload links to new download links
    await updateOldLinks();
    
    notifyListeners();
  } catch (error) {
    papersData = [];
  }
};

export const getPapers = () => papersData;

export const setPapers = async (newPapers) => {
  try {
    await updatePapersData(newPapers);
    papersData = [...newPapers];
    notifyListeners();
  } catch (error) {
    throw error;
  }
};

export const deletePaper = async (paperID) => {
  try {
    const loadingToast = toast.loading('Deleting paper...');
    
    papersData = papersData.filter(paper => paper.paperID !== paperID);
    
    await updatePapersData(papersData);
    
    notifyListeners();
    
    toast.dismiss(loadingToast);
    toast.success('Paper deleted successfully!');
  } catch (error) {
    toast.error('Failed to delete paper. Please try again.');
    
    papersData = await getInitialPapers();
    notifyListeners();
  }
};

export const updatePaper = async (paperID, updatedPaper) => {
  try {
    const loadingToast = toast.loading('Updating paper...');
    
    papersData = papersData.map(paper => 
      paper.paperID === paperID ? updatedPaper : paper
    );
    
    await updatePapersData(papersData);
    
    notifyListeners();
    
    toast.dismiss(loadingToast);
    toast.success('Paper updated successfully!');
  } catch (error) {
    toast.error('Failed to update paper. Please try again.');
    
    papersData = await getInitialPapers();
    notifyListeners();
  }
};

export const addPaper = (newPaper) => {
  papersData = [...papersData, newPaper];
  notifyListeners();
};

export const resetPapers = async () => {
  try {
    papersData = await getInitialPapers();
    notifyListeners();
  } catch (error) {
    papersData = [];
  }
};

export const subscribeToChanges = (callback) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(listener => listener !== callback);
  };
};

// Function to update old upload links to new download links
export const updateOldLinks = async () => {
  try {
    let hasChanges = false;
    const updatedPapers = papersData.map(paper => {
      let updated = false;
      let newPaper = { ...paper };
      
      // Update question paper link if it uses old upload format
      if (paper.queLink && paper.queLink.includes('/uploads/') && !paper.queLink.includes('/download/')) {
        const paperId = paper.paperID;
        newPaper.queLink = `http://127.0.0.1:3000/download/${paperId}/question_paper.pdf`;
        updated = true;
      }
      
      // Update solution link if it uses old upload format
      if (paper.solLink && paper.solLink.includes('/uploads/') && !paper.solLink.includes('/download/')) {
        const paperId = paper.paperID;
        newPaper.solLink = `http://127.0.0.1:3000/download/${paperId}/ans_key.pdf`;
        updated = true;
      }
      
      if (updated) {
        hasChanges = true;
      }
      
      return newPaper;
    });
    
    if (hasChanges) {
      papersData = updatedPapers;
      await updatePapersData(papersData);
      notifyListeners();
      console.log('Updated old upload links to new download links');
    }
  } catch (error) {
    console.error('Error updating old links:', error);
  }
};